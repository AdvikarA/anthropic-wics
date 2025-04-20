"use client";

import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from 'next/image';

interface NewsSource {
  title: string;
  source: string;
  link: string;
}

interface UniqueClaim {
  source: string;
  claims: string;
  bias?: 'left' | 'right' | 'center' | 'unknown';
}

interface NewsStory {
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
}

export default function Home() {
  const { data: session } = useSession();
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<string[]>([]);
  const [expandedSources, setExpandedSources] = useState<string[]>([]);

  // Only fetch news on initial load
  useEffect(() => {
    if (session && newsStories.length === 0) {
      fetchNews();
    }
  }, [session]);

  const fetchNews = async (refresh = false) => {
    if (!session) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a controller with a timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        // Add refresh parameter if requested
        const url = refresh ? "/api/news?refresh=true" : "/api/news";
        console.log(`Fetching news from ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache'
          },
          // Don't pass the signal to avoid the abort error
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Debug the received news stories to check for bias information
        console.log('Received news stories:', data.newsStories?.length || 0);
        if (data.newsStories && data.newsStories.length > 0) {
          // Check the first story for bias info
          const firstStory = data.newsStories[0];
          console.log('First story has sourceBias:', !!firstStory.sourceBias);
          if (firstStory.sourceBias) {
            console.log('Number of sources with bias:', firstStory.sourceBias.length);
            console.log('Sample bias info:', firstStory.sourceBias[0]);
          }
          
          // Check all stories
          let totalBiasSourcesCount = 0;
          data.newsStories.forEach((story: NewsStory, idx: number) => {
            if (story.sourceBias && story.sourceBias.length > 0) {
              totalBiasSourcesCount += story.sourceBias.length;
              console.log(`Story ${idx} has ${story.sourceBias.length} sources with bias info`);
            }
          });
          console.log('Total sources with bias across all stories:', totalBiasSourcesCount);
        }
        
        setNewsStories(data.newsStories || []);
        setError(null);
      } catch (fetchError: any) {
        // If the controller aborted the request, provide a clearer error message
        if (fetchError && fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      setError(error instanceof Error ? error.message : 'Failed to load news');
      setNewsStories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContent = (storyKey: string) => {
    if (expandedStories.includes(storyKey)) {
      setExpandedStories(expandedStories.filter(key => key !== storyKey));
    } else {
      setExpandedStories([...expandedStories, storyKey]);
    }
  };

  const toggleSource = (sourceKey: string) => {
    if (expandedSources.includes(sourceKey)) {
      setExpandedSources(expandedSources.filter(key => key !== sourceKey));
    } else {
      setExpandedSources([...expandedSources, sourceKey]);
    }
  };

  // Group stories by category
  const categorizedStories: {[key: string]: NewsStory[]} = {};
  newsStories.forEach(story => {
    const category = story.category || 'other';
    if (!categorizedStories[category]) {
      categorizedStories[category] = [];
    }
    categorizedStories[category].push(story);
  });

  // Define category display names and order
  const categoryDisplayNames: {[key: string]: string} = {
    'us': 'US News',
    'world': 'World News',
    'politics': 'Politics',
    'business': 'Business & Economy',
    'technology': 'Technology',
    'health': 'Health',
    'science': 'Science',
    'sports': 'Sports',
    'entertainment': 'Entertainment',
    'social': 'Social & Lifestyle',
    'other': 'Other News'
  };

  const categoryOrder = [
    'us', 'world', 'politics', 'business', 'technology', 
    'health', 'science', 'sports', 'entertainment', 'social', 'other'
  ];

  // Helper function to get bias color
  const getBiasColor = (bias?: string) => {
    switch(bias) {
      case 'left': return 'bg-blue-100 text-blue-800';
      case 'right': return 'bg-red-100 text-red-800';
      case 'center': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to News AI</h1>
          <p className="mb-4">Please sign in to view the latest news</p>
          <button
            onClick={() => signIn("google")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Auth bar */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-12">
            {session ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">Welcome, {session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 text-sm hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="text-gray-400 text-sm hover:text-white"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="py-12 bg-gray-900 text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-serif text-7xl font-bold tracking-tight mb-4">AI NEWS</h1>
          <div className="text-gray-400 text-sm font-serif italic">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </header>
      
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900">AI News Analyzer</h1>
          <div className="flex space-x-2">
            <button 
              onClick={(e) => { e.preventDefault(); fetchNews(false); }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition duration-150 ease-in-out flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : 'Check Cache'}
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); fetchNews(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition duration-150 ease-in-out flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </>
              ) : 'Refresh News'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-12">
            {categoryOrder.map(category => {
              if (!categorizedStories[category] || categorizedStories[category].length === 0) return null;
              
              return (
                <div key={category} className="mb-12">
                  <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                    {categoryDisplayNames[category]}
                  </h2>
                  
                  <div className="space-y-8">
                    {categorizedStories[category].map((story, idx) => {
                      const storyKey = `${category}-${idx}`;
                      
                      return (
                        <div key={storyKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                          <div className="p-6">
                            <h3 className="text-xl font-serif font-bold text-gray-900 mb-3">{story.headline}</h3>
                            
                            <p className="text-gray-700 mb-4 font-serif">{story.summary}</p>
                            
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Sources:</h4>
                              <div className="space-y-2">
                                {story.sources.map((source, sourceIdx) => {
                                  const sourceKey = `${storyKey}-source-${sourceIdx}`;
                                  
                                  // Find bias info for this source if available
                                  const biasInfo = story.sourceBias?.find(sb => sb.source === source.source);
                                  
                                  return (
                                    <div key={sourceKey} className="border border-gray-200 rounded-md p-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <a 
                                            href={source.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            {source.title}
                                          </a>
                                          <div className="text-sm text-gray-600 mt-1">
                                            Source: {source.source}
                                            {biasInfo && (
                                              <span 
                                                className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBiasColor(biasInfo.bias)}`}
                                              >
                                                {biasInfo.bias.charAt(0).toUpperCase() + biasInfo.bias.slice(1)} bias
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {biasInfo && biasInfo.biasQuotes && biasInfo.biasQuotes.length > 0 && (
                                          <button
                                            onClick={(e) => { e.preventDefault(); toggleSource(sourceKey); }}
                                            className="text-sm text-gray-500 hover:text-gray-700"
                                          >
                                            {expandedSources.includes(sourceKey) ? 'Hide Quotes' : 'Show Quotes'}
                                          </button>
                                        )}
                                      </div>
                                      
                                      {biasInfo && biasInfo.biasQuotes && biasInfo.biasQuotes.length > 0 && expandedSources.includes(sourceKey) && (
                                        <div className="mt-3 pl-4 border-l-2 border-gray-200">
                                          <div className="space-y-2">
                                            {biasInfo.biasQuotes.map((quote, quoteIdx) => (
                                              <div key={`${sourceKey}-quote-${quoteIdx}`} className="text-sm text-gray-700 italic">
                                                "{quote}"
                                              </div>
                                            ))}
                                          </div>
                                          <div className="mt-3 text-xs text-gray-500 italic">
                                            These quotes may indicate political leaning or bias in the reporting.
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {story.fullContent && (
                              <div className="mt-6">
                                <button
                                  onClick={() => toggleContent(storyKey)}
                                  className="text-gray-800 hover:text-gray-600 font-serif font-medium underline"
                                >
                                  {expandedStories.includes(storyKey) ? 'Hide Full Content' : 'Show Full Content'}
                                </button>
                                
                                {expandedStories.includes(storyKey) && (
                                  <div className="mt-4 p-5 bg-gray-50 border-l-2 border-gray-300">
                                    <p className="whitespace-pre-line font-serif leading-relaxed">{story.fullContent}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                              <span className="text-xs text-gray-500 font-serif italic">
                                {story.publishedAt ? (
                                  <>Published: {new Date(story.publishedAt).toLocaleDateString()}</>
                                ) : (
                                  <>Updated: {new Date().toLocaleDateString()}</>
                                )}
                              </span>
                              <div>
                                <button 
                                  className="text-xs text-gray-700 hover:text-gray-900 font-serif mr-4" 
                                  onClick={() => alert('Saved for later!')}
                                >
                                  Save
                                </button>
                                <button 
                                  className="text-xs text-gray-700 hover:text-gray-900 font-serif" 
                                  onClick={() => alert('Shared!')}
                                >
                                  Share
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {newsStories.length === 0 && !isLoading && (
              <div className="text-center py-16 border border-gray-200">
                <p className="text-gray-700 mb-4 font-serif text-lg">No news stories available.</p>
                <p className="text-gray-600 font-serif">Click the Refresh News button to load the latest stories.</p>
                {error && <p className="text-red-500 mt-2 font-serif">{error}</p>}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} AI News. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
