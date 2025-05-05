"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import SourceItem from '@/components/SourceItem';

interface NewsSource {
  title: string;
  source: string;
  link: string;
  quote?: string; // Quote from this source about the story
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
  imageUrl?: string;
}

export default function Home() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [newsStories, setNewsStories] = useState<NewsStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<string[]>([]);
  const [expandedSources, setExpandedSources] = useState<{[key: string]: boolean}>({});
  const [storyImages, setStoryImages] = useState<{[key: string]: string}>({});
  const [userPoliticalProfile, setUserPoliticalProfile] = useState<any>(null);
  const [affirmingStories, setAffirmingStories] = useState<NewsStory[]>([]);
  const [challengingStories, setChallengingStories] = useState<NewsStory[]>([]);

  useEffect(() => {
    // Only fetch news if authenticated and no stories loaded yet
    if (user && newsStories.length === 0) {
      fetchNews();
      // Also fetch perspective-based news
      fetchPerspectiveNews();
    }
  }, [user]);
  
  // Fetch images for a single story
  const fetchImageForStory = async (headline: string) => {
    try {
      if (!headline) return;
      
      // Skip if we already have an image for this headline
      if (storyImages[headline]) return;
      
      const response = await fetch(`/api/image-search?query=${encodeURIComponent(headline)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.imageUrl) {
        setStoryImages(prev => ({
          ...prev,
          [headline]: data.imageUrl
        }));
      }
    } catch (error) {
      console.error(`Error fetching image for "${headline}":`, error);
    }
  };
  
  // Fetch images for all stories in a batch
  const fetchImagesForStories = async (stories: NewsStory[]) => {
    try {
      // Filter stories that don't already have images and don't have pending image requests
      const storiesNeedingImages = stories.filter(story => 
        !story.imageUrl && 
        !storyImages[story.headline]
      );
      
      if (storiesNeedingImages.length === 0) return;
      
      console.log(`Fetching images for ${storiesNeedingImages.length} stories`);
      
      // Fetch images in parallel with rate limiting
      const promises = storiesNeedingImages.map((story, index) => 
        new Promise(resolve => {
          // Stagger requests to avoid rate limits
          setTimeout(() => {
            fetchImageForStory(story.headline).then(resolve);
          }, index * 200); // 200ms delay between each request
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error in batch image fetching:', error);
    }
  };

  // Fetch user's political profile from Supabase or localStorage
  const fetchUserProfile = useCallback(async () => {
    try {
      // First try to get profile from localStorage
      if (typeof window !== 'undefined') {
        const localProfile = localStorage.getItem('userPoliticalProfile');
        if (localProfile) {
          try {
            const profileData = JSON.parse(localProfile);
            setUserPoliticalProfile(profileData);
            console.log('User political profile loaded from localStorage:', profileData);
            
            // After loading profile, fetch perspective news if we don't have any yet
            if (affirmingStories.length === 0 || challengingStories.length === 0) {
              fetchPerspectiveNews();
            }
            
            return; // Exit early if we found a profile in localStorage
          } catch (parseError) {
            console.error('Error parsing localStorage profile:', parseError);
            // Continue to try server-side profile
          }
        }
      }
      
      // If no localStorage profile or not in browser, try server if authenticated
      if (!user) return;
      
      // Use the user email as identifier since Supabase user might not have id
      const userEmail = user.email;
      if (!userEmail) return;
      
      const response = await fetch(`/api/user-profile?userEmail=${encodeURIComponent(userEmail)}`);
      
      if (!response.ok) {
        console.error('Failed to fetch user profile from server');
        return;
      }
      
      const data = await response.json();
      if (data.surveyResults) {
        setUserPoliticalProfile(data.surveyResults);
        console.log('User political profile loaded from server:', data.surveyResults);
        
        // Also save to localStorage for future use
        if (typeof window !== 'undefined') {
          localStorage.setItem('userPoliticalProfile', JSON.stringify(data.surveyResults));
        }
        
        // After loading profile, fetch perspective news if we don't have any yet
        if (affirmingStories.length === 0 || challengingStories.length === 0) {
          fetchPerspectiveNews();
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user, affirmingStories.length, challengingStories.length]);

  // Function to fetch perspective-based news (articles that align/challenge user views)
  const fetchPerspectiveNews = async (refresh = false) => {
    if (!user?.email) {
      console.log('Cannot fetch perspective news: user email not available');
      return;
    }
    
    try {
      console.log('Fetching perspective-based news...');
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('userEmail', user.email);
      params.append('type', 'all');
      if (refresh) params.append('refresh', 'true');
      
      const url = `/api/news/perspective?${params.toString()}`;
      console.log(`Fetching from: ${url}`);
      
      const response = await fetch(url, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch perspective news: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Perspective API response:', data);
      
      // Handle potential errors from API
      if (data.error) {
        throw new Error(`API Error: ${data.error}`);
      }
      
      // Update state with the perspective-based news
      if (Array.isArray(data.aligningStories)) {
        setAffirmingStories(data.aligningStories);
        console.log(`Loaded ${data.aligningStories.length} aligning stories`);
      }
      
      if (Array.isArray(data.challengingStories)) {
        setChallengingStories(data.challengingStories);
        console.log(`Loaded ${data.challengingStories.length} challenging stories`);
      }
      
      // Fetch images for stories if needed
      const allStories = [...(data.aligningStories || []), ...(data.challengingStories || [])];
      await fetchImagesForStories(allStories);
      
    } catch (error) {
      console.error('Error fetching perspective news:', error);
      // Keep existing stories if there's an error
    }
  };
  
  // Legacy function to categorize stories based on user's political profile
  // This is kept for backward compatibility but we now use the API-based approach
  const categorizeStories = (stories: NewsStory[], profile: any) => {
    try {
      if (!profile || !Array.isArray(stories) || stories.length === 0) {
        console.log('Cannot categorize: invalid profile or stories');
        return;
      }
      
      // Extract key political indicators with safe fallbacks
      const userLeftRight = (
        (profile['Individual Rights']?.score || 5) + 
        (profile['Economic Systems']?.score || 5) + 
        (profile['Government Role']?.score || 5) +
        (profile['Social Issues']?.score || 5)
      ) / 4;
      
      // Higher score = more left-leaning, lower score = more right-leaning
      console.log('User left-right score:', userLeftRight);
      
      // Categorize stories based on their bias compared to user's position
      const affirming: NewsStory[] = [];
      const challenging: NewsStory[] = [];
      
      stories.forEach(story => {
        if (!story) return; // Skip invalid stories
        
        // Safely access sourceBias with fallbacks
        const sourceBiasArray = Array.isArray(story.sourceBias) ? story.sourceBias : [];
        const firstBias = sourceBiasArray.length > 0 ? sourceBiasArray[0] : null;
        const storyBias = firstBias?.bias || 'center';
        
        let storyScore = 5; // Default center
        
        if (storyBias === 'left') storyScore = 8;
        else if (storyBias === 'right') storyScore = 2;
        
        // Calculate difference between user and story
        const difference = Math.abs(userLeftRight - storyScore);
        
        // If difference is small, story affirms user's beliefs
        // If difference is large, story challenges user's beliefs
        if (difference < 3) {
          affirming.push(story);
        } else {
          challenging.push(story);
        }
      });
      
      // Only set state if we don't already have perspective stories from the API
      if (affirmingStories.length === 0) {
        setAffirmingStories(affirming);
      }
      
      if (challengingStories.length === 0) {
        setChallengingStories(challenging);
      }
      
      console.log(`Categorized ${affirming.length} affirming and ${challenging.length} challenging stories`);
    } catch (error) {
      console.error('Error in categorizeStories:', error);
      // Only set empty arrays if we don't already have perspective stories
      if (affirmingStories.length === 0) setAffirmingStories([]);
      if (challengingStories.length === 0) setChallengingStories([]);
    }
  };

  const fetchNews = async (refresh = false, dynamic = false) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const params = new URLSearchParams();
      if (refresh) params.append('refresh', 'true');
      if (dynamic) params.append('dynamic', 'true');
      const url = `/api/news${params.toString() ? `?${params.toString()}` : ''}`;
      
      console.log(`Fetching news from: ${url}`);
      const response = await fetch(url, { 
        signal: controller.signal, 
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      // Handle potential errors from API
      if (data.error) {
        throw new Error(`API Error: ${data.error}`);
      }
      
      // Fix property name mismatch - API returns newsStories, not stories
      const stories = data.newsStories || [];
      console.log(`Received ${stories.length} stories from API`);
      
      // Ensure all stories have required properties to prevent runtime errors
      const validatedStories = stories.map((story: any) => ({
        headline: story.headline || 'Untitled',
        summary: story.summary || '',
        sources: Array.isArray(story.sources) ? story.sources : [],
        publishedAt: story.publishedAt,
        fullContent: story.fullContent,
        category: story.category || 'general',
        commonFacts: story.commonFacts,
        uniqueClaims: Array.isArray(story.uniqueClaims) ? story.uniqueClaims : [],
        sourceBias: Array.isArray(story.sourceBias) ? story.sourceBias : [],
        imageUrl: story.imageUrl || null
      }));
      
      setNewsStories(validatedStories);
      
      // Populate images: use stored URLs when not dynamic, else fetch via API
      if (!dynamic) {
        const imagesMap: {[key:string]: string} = {};
        validatedStories.forEach((s: NewsStory) => {
          if (s.imageUrl) imagesMap[s.headline] = s.imageUrl;
        });
        setStoryImages(imagesMap);
      } else {
        await fetchImagesForStories(validatedStories);
      }
      
      // Fetch user profile if not already loaded
      if (!userPoliticalProfile) {
        await fetchUserProfile();
      }
      
      // Categorize stories if profile is available
      if (userPoliticalProfile) {
        categorizeStories(validatedStories, userPoliticalProfile);
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      setError(error.message || 'Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContent = (key: string) => setExpandedStories(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );
  const toggleSource = (key: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Category grouping omitted for brevity...

  if (!user) {
    return (
      <div className="empty-state">
        <h1 className="empty-title">Welcome to AI News</h1>
        <p className="empty-description">Please sign in to view the latest news.</p>
        <button className="btn btn-primary" onClick={() => signInWithGoogle()}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-section">
        <div className="page-controls">
          <button className="btn btn-primary" onClick={() => fetchNews(true, false)} disabled={isLoading}>
            {isLoading && !error ? 'Loading Stored...' : 'Load Stored News'}
          </button>
          <button className="btn btn-secondary ml-2" onClick={() => fetchNews(true, true)} disabled={isLoading}>
            {isLoading && !error ? 'Fetching Live...' : 'Fetch Live News'}
          </button>
          <button className="btn btn-outline ml-2" onClick={() => signOut()}>Sign Out</button>
        </div>
        
        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <span className="loading-text">Loading news stories...</span>
          </div>
        )}
        
        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="btn btn-primary" onClick={() => fetchNews(true)}>Try Again</button>
          </div>
        )}
      </div>
      
      {!isLoading && !error && newsStories.length > 0 && (
        <>
          {/* Hero Section with featured story */}
          <section className="hero-section">
            <div className="hero-content">
              <span className="category-tag">Featured</span>
              <h1 className="hero-title">{newsStories[0].headline}</h1>
              <p className="hero-summary">{newsStories[0].summary}</p>
              <div className="hero-metadata">
                <span className="metadata-item">
                  {newsStories[0].publishedAt ? new Date(newsStories[0].publishedAt).toLocaleDateString() : 'Recent'}
                </span>
                <span className="metadata-item">
                  {newsStories[0].category || 'General'}
                </span>
              </div>
            </div>
            <div className="hero-image-container">
              <div className="matrix-overlay"></div>
              {newsStories[0].imageUrl || storyImages[newsStories[0].headline] ? (
                <Image 
                  src={newsStories[0].imageUrl || storyImages[newsStories[0].headline] || ''} 
                  alt={newsStories[0].headline} 
                  width={600} 
                  height={400} 
                  className="featured-image"
                />
              ) : (
                <div className="image-loading">
                  <div className="matrix-overlay"></div>
                  <div className="spinner small"></div>
                  <span className="loading-text">Finding relevant image...</span>
                </div>
              )}
            </div>
          </section>

          {/* News based on user's political profile */}
          {userPoliticalProfile && (
            <section className="political-profile-section">
              <div className="profile-header">
                <h2 className="section-title">Your News Perspective</h2>
                <div className="profile-info">
                  <p>Based on your political survey results, we've personalized your news experience.</p>
                  <a href="/survey" className="btn-small">Retake Survey</a>
                </div>
              </div>
              
              {/* Affirming News Section */}
              <div className="affirming-news">
                <div className="section-header">
                  <h3 className="subsection-title">Articles That Align With Your Views</h3>
                  <button 
                    onClick={() => fetchPerspectiveNews(true)}
                    className="refresh-button"
                    title="Get fresh articles that align with your views"
                  >
                    Get Live Articles
                  </button>
                </div>
                <div className="news-grid">
                  {affirmingStories.length > 0 ? affirmingStories.slice(0, 3).map((story, index) => {
                    const key = `affirming-${index}`;
                    const sourceBias = story.sourceBias?.[0]?.bias || 'unknown';
                    return (
                      <article key={key} className="news-card affirming">
                        <div className="card-media">
                          {(story.imageUrl || storyImages[story.headline]) ? (
                            <div className="card-image-container">
                              <img 
                                src={story.imageUrl || storyImages[story.headline] || ''} 
                                alt={story.headline} 
                                width={300} 
                                height={200} 
                                className="card-image" 
                              />
                            </div>
                          ) : (
                            <div className="image-loading small">
                              <div className="spinner mini"></div>
                              <span className="loading-text small">Finding image...</span>
                            </div>
                          )}
                        </div>
                        <div className="card-content">
                          <span className="category-tag small">{story.category || 'News'}</span>
                          <h3 className="card-title">{story.headline}</h3>
                          
                          <div className="common-facts">
                            <p>{story.summary}</p>
                          </div>
                          
                          {/* Sources with Bias - Dropdown Version */}
                          <div className="sources-container">
                            <div className="sources-dropdown-header" onClick={() => toggleSource(key)}>
                              <h4 className="sources-title">Sources & Perspectives</h4>
                              <span className="dropdown-icon">{expandedSources[key] ? '▲' : '▼'}</span>
                            </div>
                            
                            {expandedSources[key] && (
                              <div className="sources-dropdown-content">
                                {story.sources.map((source, i) => {
                                  const bias = story.sourceBias?.find(b => b.source === source.source)?.bias || 'unknown';
                                  const biasQuotes = story.sourceBias?.find(b => b.source === source.source)?.biasQuotes;
                                  return (
                                    <SourceItem 
                                      key={i}
                                      source={source}
                                      bias={bias}
                                      biasQuotes={biasQuotes}
                                      userPoliticalProfile={userPoliticalProfile}
                                      isAffirming={true}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  }) : (
                    <div className="empty-state">
                      <p>No articles found that align with your views. Try clicking "Get Live Articles" to find some.</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Challenging News Section */}
              <div className="challenging-news">
                <div className="section-header">
                  <h3 className="subsection-title">Articles That Challenge Your Views</h3>
                  <button 
                    onClick={() => fetchPerspectiveNews(true)}
                    className="refresh-button"
                    title="Get fresh articles that challenge your views"
                  >
                    Get Live Articles
                  </button>
                </div>
                <div className="news-grid">
                  {challengingStories.length > 0 ? challengingStories.slice(0, 3).map((story, index) => {
                    const key = `challenging-${index}`;
                    const sourceBias = story.sourceBias?.[0]?.bias || 'unknown';
                    return (
                      <article key={key} className="news-card challenging">
                        <div className="card-media">
                          {(story.imageUrl || storyImages[story.headline]) ? (
                            <div className="card-image-container">
                              <img 
                                src={story.imageUrl || storyImages[story.headline] || ''} 
                                alt={story.headline} 
                                width={300} 
                                height={200} 
                                className="card-image" 
                              />
                            </div>
                          ) : (
                            <div className="image-loading small">
                              <div className="spinner mini"></div>
                              <span className="loading-text small">Finding image...</span>
                            </div>
                          )}
                        </div>
                        <div className="card-content">
                          <span className="category-tag small">{story.category || 'News'}</span>
                          <h3 className="card-title">{story.headline}</h3>
                          
                          <div className="common-facts">
                            <p>{story.summary}</p>
                          </div>
                          
                          {/* Sources with Bias - Dropdown Version */}
                          <div className="sources-container">
                            <div className="sources-dropdown-header" onClick={() => toggleSource(key)}>
                              <h4 className="sources-title">Sources & Perspectives</h4>
                              <span className="dropdown-icon">{expandedSources[key] ? '▲' : '▼'}</span>
                            </div>
                            
                            {expandedSources[key] && (
                              <div className="sources-dropdown-content">
                                {story.sources.map((source, i) => {
                                  const bias = story.sourceBias?.find(b => b.source === source.source)?.bias || 'unknown';
                                  const biasQuotes = story.sourceBias?.find(b => b.source === source.source)?.biasQuotes;
                                  return (
                                    <SourceItem 
                                      key={i}
                                      source={source}
                                      bias={bias}
                                      biasQuotes={biasQuotes}
                                      userPoliticalProfile={userPoliticalProfile}
                                      isAffirming={false}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  }) : (
                    <div className="empty-state">
                      <p>No articles found that challenge your views. Try clicking "Get Live Articles" to find some.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
          
          {/* Secondary News Grid */}
          <section className="secondary-news">
            <h2 className="section-title">Latest Stories</h2>
            <div className="news-grid">
              {/* Filter out the featured story and take the next 5 stories */}
              {newsStories
                .filter(story => story.headline !== newsStories[0].headline) // Exclude the featured story
                .slice(0, 5) // Take only 5 stories
                .map((story, index) => {
                const key = `story-${index}`;
                const sourceBias = story.sourceBias?.[0]?.bias || 'unknown';
                
                return (
                  <article key={key} className="news-card">
                    <div className="card-media">
                      {(story.imageUrl || storyImages[story.headline]) ? (
                        <div className="card-image-container">
                          {/* Use a more compatible approach for external images */}
                          <img 
                            src={story.imageUrl || storyImages[story.headline] || ''} 
                            alt={story.headline} 
                            width={300} 
                            height={200} 
                            className="card-image" 
                          />
                        </div>
                      ) : (
                        <div className="image-loading small">
                          <div className="spinner mini"></div>
                          <span className="loading-text small">Finding image...</span>
                        </div>
                      )}
                    </div>
                    <div className="card-content">
                      <span className="category-tag small">{story.category || 'News'}</span>
                      <h3 className="card-title">{story.headline}</h3>
                      
                      <div className="story-content">
                        <p>{story.summary}</p>
                      </div>
                      
                      <div className="sources-container">
                        <div className="sources-dropdown-header" onClick={() => toggleSource(key)}>
                          <h4 className="sources-title">Sources & Perspectives</h4>
                          <span className="dropdown-icon">{expandedSources[key] ? '▲' : '▼'}</span>
                        </div>
                        
                        {expandedSources[key] && (
                          <div className="sources-dropdown-content">
                            {story.sources.map((source, i) => {
                              const bias = story.sourceBias?.find(b => b.source === source.source)?.bias || 'unknown';
                              const biasQuotes = story.sourceBias?.find(b => b.source === source.source)?.biasQuotes || [];
                              
                              return (
                                <div key={i} className="source-item">
                                  <div className="source-header">
                                    <h5 className="source-title">{source.title || source.source}</h5>
                                    <span className={`bias-tag ${bias}`}>{bias}</span>
                                  </div>
                                  
                                  {source.quote && (
                                    <blockquote className="source-quote">"{source.quote}"</blockquote>
                                  )}
                                  
                                  {biasQuotes && biasQuotes.length > 0 && (
                                    <div className="bias-quotes">
                                      <h6 className="bias-quotes-title">Bias Indicators:</h6>
                                      <ul className="bias-quotes-list">
                                        {biasQuotes.map((quote, qIdx) => (
                                          <li key={qIdx} className="bias-quote">"{quote}"</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
      
      {/* Footer is in layout.tsx */}
    </div>
  );
}
