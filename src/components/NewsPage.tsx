"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';

interface NewsStory {
  headline: string;
  summary: string;
  sources: any[];
  imageUrl?: string;
  category?: string;
  uniqueClaims?: any[];
  sourceBias?: any[];
}

type Props = { category: string };

export default function NewsPage({ category }: Props) {
  const { user } = useAuth();
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (isDynamic = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the new category API endpoint instead of filtering client-side
      const response = await fetch(`/api/news/category?category=${category}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log(`Found ${data.newsStories?.length || 0} ${category} stories`);
      setNewsStories(data.newsStories || []);
      
      // After loading stories, check if any are missing analysis
      if (data.newsStories && data.newsStories.length > 0) {
        checkForMissingAnalysis(data.newsStories);
      }
    } catch (e) {
      console.error('Error fetching news:', e);
      setError('Failed to load stories: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check for stories without analysis and generate it
  const checkForMissingAnalysis = async (stories: NewsStory[]) => {
    try {
      // Check if any stories are missing analysis (no sources or empty sources array)
      const storiesWithoutAnalysis = stories.filter(story => 
        !story.sources || story.sources.length === 0
      );
      
      if (storiesWithoutAnalysis.length > 0) {
        console.log(`Found ${storiesWithoutAnalysis.length} stories without analysis, generating...`);
        
        // Call the analysis API to generate missing analysis
        const response = await fetch(`/api/news/analysis?checkAll=true`);
        const data = await response.json();
        
        if (data.processed > 0) {
          console.log(`Generated analysis for ${data.processed} stories`);
          // Refresh the stories to show the new analysis
          fetchNews(false);
        }
      }
    } catch (error) {
      console.error('Error checking for missing analysis:', error);
      // Don't set error state here to avoid disrupting the user experience
    }
  };
  
  useEffect(() => {
    if (user) {
      // Load stored news on initial component mount
      fetchNews(false);
    }
  }, [user, category]);

  if (!user) return <p>Please sign in to view {category} news.</p>;
  if (isLoading) return <p>Loading {category} news...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="space-y-4">
      <h1 className={"text-2xl font-bold capitalize"}>{category} News</h1>
      
      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => fetchNews(false)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Load Stored News
        </button>
        <button 
          onClick={() => fetchNews(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Fetch Live News
        </button>
        <button 
          onClick={() => {
            fetch('/api/news/analysis?checkAll=true')
              .then(res => res.json())
              .then(data => {
                if (data.processed > 0) {
                  alert(`Generated analysis for ${data.processed} stories. Refreshing...`);
                  fetchNews(false);
                } else {
                  alert('No stories need analysis generation at this time.');
                }
              })
              .catch(err => {
                console.error('Error generating analysis:', err);
                alert('Error generating analysis. See console for details.');
              });
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Generate Missing Analysis
        </button>
      </div>
      
      {newsStories.length === 0 && !isLoading && (
        <p>No {category} news stories available. Try fetching live news.</p>
      )}
      
      {newsStories.map((story, index) => (
        <div key={`${story.headline}-${index}`} className="p-4 border rounded shadow-sm">
          <h2 className="font-semibold text-lg">{story.headline}</h2>
          {story.imageUrl && (
            <div className="my-2">
              <Image 
                src={story.imageUrl} 
                alt={story.headline} 
                width={400} 
                height={200} 
                className="object-cover rounded"
              />
            </div>
          )}
          <p className="my-2">{story.summary}</p>
          
          {/* Sources with links */}
          {story.sources && story.sources.length > 0 && (
            <div className="mt-2">
              <h3 className="font-medium">Sources:</h3>
              <ul className="list-disc pl-5">
                {story.sources.map((source, i) => (
                  <li key={i}>
                    {source.link ? (
                      <a 
                        href={source.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {source.source}: {source.title}
                      </a>
                    ) : (
                      <span>{source.source}: {source.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
