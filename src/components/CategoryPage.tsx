"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import CoreTemplate from './CoreTemplate';

interface NewsSource {
  title: string;
  source: string;
  link: string;
  quote?: string;
}

interface UniqueClaim {
  source: string;
  claims: string;
  bias?: 'left' | 'right' | 'center' | 'unknown';
}

interface NewsStory {
  id: string;
  headline: string;
  summary: string;
  sources: NewsSource[];
  publishedAt?: string;
  fullContent?: string;
  category?: string;
  commonFacts?: string;
  uniqueClaims?: UniqueClaim[];
  sourceBias?: {
    source: string;
    bias: 'left' | 'right' | 'center' | 'unknown';
    biasQuotes: string[];
  }[];
  imageUrl?: string;
}

type Props = { category: string };

export default function CategoryPage({ category }: Props) {
  const { user } = useAuth();
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<string[]>([]);
  const [expandedSources, setExpandedSources] = useState<{[key: string]: boolean}>({});
  const [storyImages, setStoryImages] = useState<{[key: string]: string}>({});

  // Fetch news for this category
  const fetchNews = async (isDynamic = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch stories with analysis - use dynamic endpoint if requested
      const endpoint = isDynamic ? `/api/news/category/live?category=${category}` : `/api/news/category?category=${category}`;
      let response = await fetch(endpoint);
      let data = await response.json();
      if (data.error) throw new Error(data.error);

      // Check for stories missing analysis
      let rawStories = data.newsStories || [];
      const storiesMissing = rawStories.filter((story: any) =>
        !story.sources || story.sources.length === 0
      );
      if (storiesMissing.length > 0) {
        console.log(`Found ${storiesMissing.length} stories without analysis, generating...`);
        await ensureAnalysisComplete();
        // Re-fetch stories after analysis generation
        response = await fetch(`/api/news/category?category=${category}`);
        data = await response.json();
        if (data.error) throw new Error(data.error);
        rawStories = data.newsStories || [];
      }

      // Map and validate stories with analysis
      const validatedStories = rawStories.map((story: any) => ({
        id: story.id || crypto.randomUUID(),
        headline: story.headline || 'Untitled',
        summary: story.summary || '',
        sources: Array.isArray(story.sources) ? story.sources : [],
        publishedAt: story.publishedAt,
        fullContent: story.fullContent,
        category: story.category || category,
        commonFacts: story.commonFacts,
        uniqueClaims: Array.isArray(story.uniqueClaims) ? story.uniqueClaims : [],
        sourceBias: Array.isArray(story.sourceBias) ? story.sourceBias : [],
        imageUrl: story.imageUrl || null
      }));

      setNewsStories(validatedStories);
      // Populate images
      const imagesMap: {[key: string]: string} = {};
      validatedStories.forEach((s: NewsStory) => {
        if (s.imageUrl) imagesMap[s.headline] = s.imageUrl;
      });
      setStoryImages(imagesMap);
      
      // Check for stories without analysis
      if (validatedStories.length > 0) {
        checkForMissingAnalysis(validatedStories);
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      setError(error.message || 'Failed to load news');
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
      }
    } catch (error) {
      console.error('Error checking for missing analysis:', error);
    }
  };
  
  // Ensure all analyses are generated before displaying stories
  const ensureAnalysisComplete = async () => {
    try {
      let remaining;
      do {
        const resp = await fetch('/api/news/analysis?checkAll=true');
        const result = await resp.json();
        const processedCount = result.processed || 0;
        remaining = result.remaining || 0;
        console.log(`Processed ${processedCount}, remaining ${remaining}`);
      } while (remaining > 0);
    } catch (error) {
      console.error('Error ensuring analysis complete:', error);
    }
  };

  // Generate analysis for stories without it
  const generateMissingAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/news/analysis?checkAll=true');
      const data = await response.json();
      
      if (data.processed > 0) {
        alert(`Generated analysis for ${data.processed} stories. Refreshing...`);
        fetchNews(false);
      } else {
        alert('No stories need analysis generation at this time.');
      }
    } catch (err) {
      console.error('Error generating analysis:', err);
      alert('Error generating analysis. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Load news on initial component mount
      fetchNews(false);
    }
  }, [user, category]);

  const toggleContent = (key: string) => setExpandedStories(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );
  
  const toggleSource = (key: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <CoreTemplate
      title={`${category} News`}
      description={`Explore ${category} news with AI-powered bias analysis. See different perspectives on the same stories.`}
      onLoadStored={() => fetchNews(false)}
      onFetchLive={() => fetchNews(true)}
      onGenerateAnalysis={generateMissingAnalysis}
      isLoading={isLoading}
      error={error}
      heroStory={newsStories.length > 0 ? {
        ...newsStories[0],
        imageUrl: newsStories[0].imageUrl || storyImages[newsStories[0].headline] || undefined
      } : undefined}
      showHero={newsStories.length > 0}
    >

          {/* News Grid */}
          {!isLoading && !error && newsStories.length === 0 && (
            <div className="empty-state">
              <h2 className="empty-title">No {category} News Stories Found</h2>
              <p className="empty-description">Click the Refresh button to load the latest {category} news with AI-powered bias analysis.</p>
            </div>
          )}
          
          {!isLoading && !error && newsStories.length > 0 && (
            <section className="news-grid">
              <h2 className="section-title">Latest {category} Stories</h2>
              <div className="grid-container">
                {newsStories.slice(1).map((story, index) => (
                <div key={`${story.id || story.headline}-${index}`} className="news-card">
                  <div className="card-image">
                    {story.imageUrl || storyImages[story.headline] ? (
                      <Image 
                        src={story.imageUrl || storyImages[story.headline] || ''} 
                        alt={story.headline} 
                        width={300} 
                        height={200} 
                        className="card-img"
                      />
                    ) : (
                      <div className="image-placeholder">
                        <span>{category.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="image-overlay"></div>
                  </div>
                  
                  <div className="card-content">
                    <h3 className="card-title">{story.headline}</h3>
                    <p className="card-summary">{story.summary}</p>
                    
                    {story.sourceBias && story.sourceBias.length > 0 && (
                      <div className="card-bias">
                        <span className={`bias-tag small bias-${story.sourceBias[0]?.bias || 'unknown'}`}>
                          {(story.sourceBias[0]?.bias || 'unknown').charAt(0).toUpperCase() + 
                          (story.sourceBias[0]?.bias || 'unknown').slice(1)}
                        </span>
                      </div>
                    )}
                    
                    <button 
                      className="card-expand"
                      onClick={() => toggleContent(`${story.id || story.headline}-${index}`)}
                    >
                      {expandedStories.includes(`${story.id || story.headline}-${index}`) ? 'Show Less' : 'Show More'}
                    </button>
                    
                    {expandedStories.includes(`${story.id || story.headline}-${index}`) && (
                      <div className="expanded-content">
                        {story.commonFacts && (
                          <div className="common-facts">
                            <h4>Common Facts</h4>
                            <p>{story.commonFacts}</p>
                          </div>
                        )}
                        
                        {story.sources && story.sources.length > 0 && (
                          <div className="sources-list">
                            <h4>Sources</h4>
                            <ul>
                              {story.sources.map((source, idx) => (
                                <li key={`${source.source}-${idx}`}>
                                  <div className="source-header">
                                    <span className="source-name">{source.source}</span>
                                    <button 
                                      className="source-toggle"
                                      onClick={() => toggleSource(`${story.id || story.headline}-${index}-${idx}`)}
                                    >
                                      {expandedSources[`${story.id || story.headline}-${index}-${idx}`] ? 'Hide' : 'View'}
                                    </button>
                                  </div>
                                  
                                  {expandedSources[`${story.id || story.headline}-${index}-${idx}`] && (
                                    <div className="source-details">
                                      <h5>{source.title}</h5>
                                      {source.quote && <p className="source-quote">"{source.quote}"</p>}
                                      {source.link && source.link !== '#' && (
                                        <a href={source.link} target="_blank" rel="noopener noreferrer" className="source-link">
                                          Read Original
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {story.sourceBias && story.sourceBias.length > 0 && (
                          <div className="bias-analysis">
                            <h4>Bias Analysis</h4>
                            <ul>
                              {story.sourceBias.map((bias, idx) => (
                                <li key={`bias-${idx}`} className={`bias-item bias-${bias.bias}`}>
                                  <div className="bias-header">
                                    <span className="bias-source">{bias.source}</span>
                                    <span className="bias-label">{bias.bias.toUpperCase()}</span>
                                  </div>
                                  {bias.biasQuotes && bias.biasQuotes.length > 0 && (
                                    <div className="bias-quotes">
                                      {bias.biasQuotes.map((quote, qIdx) => (
                                        <p key={`quote-${qIdx}`} className="bias-quote">"{quote}"</p>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </section>
          )}
    </CoreTemplate>
  );
}
