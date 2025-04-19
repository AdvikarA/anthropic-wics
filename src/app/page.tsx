"use client";

import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [newsStories, setNewsStories] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStory, setExpandedStory] = useState<number | null>(null);

  // Fetch news when the page loads if user is logged in
  useEffect(() => {
    if (session) {
      fetchNews();
    }
  }, [session]);

  const formatDate = () => {
    const date = new Date();
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const fetchNews = async () => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch("/api/news", {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setNewsStories(data.newsStories || []);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
    } catch (error) {
      console.error("Error fetching news:", error);
      setError(error instanceof Error ? error.message : 'Failed to load news');
      setNewsStories([]);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gray-100">
      <main className="min-h-screen">
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
            <h1 className="font-playfair text-7xl font-bold tracking-tight mb-4">AI NEWS</h1>
            <div className="text-gray-400 text-sm font-serif italic">{formatDate()}</div>
            {session && (
              <button
                onClick={fetchNews}
                className="mt-6 text-gray-400 hover:text-white text-sm inline-flex items-center"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? "Updating..." : "Update News"}
              </button>
            )}
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <button
              onClick={fetchNews}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Update News
            </button>
          </div>
          {newsStories.length > 0 ? (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {newsStories.map((story: any, index: number) => (
                  <article key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="p-6">
                      <h2 className="font-playfair text-xl font-bold mb-3 leading-tight text-gray-900 cursor-pointer"
                        onClick={() => setExpandedStory(expandedStory === index ? null : index)}>
                        {story.headline}
                        <span className="ml-2 text-sm text-blue-500">
                          {expandedStory === index ? '▲' : '▼'}
                        </span>
                      </h2>
                      
                      {expandedStory === index ? (
                        <div className="mb-4">
                          <div className="prose prose-sm max-w-none mb-6">
                            {story.fullContent ? (
                              <div>
                                {story.fullContent.split('\n\n').map((paragraph: string, i: number) => (
                                  paragraph.trim() && <p key={i} className="mb-3 text-gray-700">{paragraph}</p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-700 leading-relaxed">{story.summary}</p>
                            )}
                          </div>
                          
                          <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-blue-800 mb-2">AI Summary:</h4>
                            <p className="text-gray-700 italic">{story.summary}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 text-base mb-4 leading-relaxed line-clamp-3">{story.summary}</p>
                      )}
                      
                      <h3 className="text-sm font-semibold mb-2 text-gray-800 uppercase tracking-wider">Sources:</h3>
                      <div className="space-y-2">
                        {story.sources.map((source: any, sourceIndex: number) => (
                          <div key={sourceIndex} className="border-l-4 border-blue-500 pl-3 py-1">
                            <a 
                              href={source.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <h4 className="font-medium text-blue-600 hover:underline text-sm mb-1 line-clamp-1">{source.title}</h4>
                              <div className="flex items-center text-xs text-gray-500">
                                <span>{source.source}</span>
                              </div>
                            </a>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {story.publishedAt ? (
                            <>Published: {new Date(story.publishedAt).toLocaleDateString()}</>
                          ) : (
                            <>Updated: {new Date().toLocaleDateString()}</>
                          )}
                        </span>
                        <div>
                          <button 
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-3" 
                            onClick={() => setExpandedStory(expandedStory === index ? null : index)}
                          >
                            {expandedStory === index ? 'Show Less' : 'Show More'}
                          </button>
                          <button 
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium" 
                            onClick={() => window.open(story.sources[0].link, '_blank')}
                          >
                            Read Original →
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden p-6 animate-pulse">
                    <div className="h-6 w-3/4 bg-gray-200 mb-4"></div>
                    <div className="h-4 w-full bg-gray-100 mb-2"></div>
                    <div className="h-4 w-full bg-gray-100 mb-2"></div>
                    <div className="h-4 w-2/3 bg-gray-100 mb-6"></div>
                    <div className="h-3 w-1/3 bg-gray-200 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-gray-100 mb-1"></div>
                      <div className="h-3 w-full bg-gray-100 mb-1"></div>
                      <div className="h-3 w-full bg-gray-100"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-500 mb-2">Error loading news:</p>
              <p className="text-gray-700 mb-4">{error}</p>
              <button
                onClick={fetchNews}
                className="text-gray-600 hover:text-gray-900 text-sm inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-600">
              Click the Update News button above to load the latest stories
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
