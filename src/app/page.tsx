"use client";

import React from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [news, setNews] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
      
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
      
      setNews(data.news);
      setLastUpdated(data.lastUpdated);
      setError(null);
    } catch (error) {
      console.error("Error fetching news:", error);
      setError(error instanceof Error ? error.message : 'Failed to load news');
      setNews(null);
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
            <h1 className="font-playfair text-7xl font-bold tracking-tight mb-4">THE DAILY BRIEF</h1>
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
          {news ? (
            <div className="divide-y divide-gray-200">
              {news.map((item: any, index: number) => (
                <article key={index} className="py-8 first:pt-0 last:pb-0">
                  <a
                    href={item.sources[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >

                    <div>
                      <span className="text-sm uppercase text-gray-500 block mb-2">{item.source}</span>
                      <h3 className="font-playfair text-2xl font-bold mb-3 leading-tight group-hover:text-gray-600 transition-colors">
                        {item.headline}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-lg mb-3 leading-relaxed">{item.summary}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <time>{item.date}</time>
                      <span className="mx-2">·</span>
                      <span>{new URL(item.sources[0]).hostname.replace('www.', '')}</span>
                    </div>
                  </a>
                </article>
              ))}
            </div>
          ) : loading ? (
            <div className="py-8">
              <div className="space-y-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-6 w-3/4 bg-gray-200 mb-4"></div>
                    <div className="h-4 w-full bg-gray-100 mb-2"></div>
                    <div className="h-4 w-full bg-gray-100 mb-2"></div>
                    <div className="h-4 w-2/3 bg-gray-100"></div>
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
