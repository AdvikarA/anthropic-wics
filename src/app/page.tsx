"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from 'next/image';

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
  const { data: session, status } = useSession();
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
    if (status === 'authenticated' && newsStories.length === 0) {
      fetchNews();
    }
  }, [status]);
  
  // Fetch user profile on component mount
  useEffect(() => {
    // Always try to fetch profile, regardless of auth status
    if (!userPoliticalProfile) {
      fetchUserProfile();
    }
    // We're intentionally only running this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Fetch images for stories that don't have images
    if (newsStories.length > 0) {
      console.log('=== IMAGE FETCH DEBUG ===');
      console.log(`Total stories: ${newsStories.length}`);
      console.log(`Stories with original images: ${newsStories.filter(s => s.imageUrl).length}`);
      console.log(`Stories with fetched images: ${Object.keys(storyImages).length}`);
      console.log('Stories needing images:', newsStories.filter(s => !s.imageUrl && !storyImages[s.headline]).map(s => s.headline));
      
      newsStories.forEach(story => {
        if (!story.imageUrl && !storyImages[story.headline]) {
          console.log(`Fetching image for: "${story.headline}"`);
          fetchImageForStory(story.headline);
        }
      });
    }
  }, [newsStories, storyImages]);

  // Function to fetch image for a story using NewsAPI
  const fetchImageForStory = async (headline: string) => {
    if (!headline || storyImages[headline]) return;
    
    try {
      console.log(`Fetching image for headline: "${headline}"`);
      const response = await fetch(`/api/news-images?query=${encodeURIComponent(headline)}`);
      
      if (!response.ok) {
        console.error(`Error fetching image: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('Image API response:', data);
      
      // Check if we have images in the response
      if (data.images && data.images.length > 0) {
        // Use the first (most relevant) image
        const imageUrl = data.images[0].url;
        console.log(`Found image URL: ${imageUrl}`);
        
        setStoryImages(prev => ({
          ...prev,
          [headline]: imageUrl
        }));
      } else {
        console.log(`No images found for: "${headline}"`);
        // Use a default image as fallback
        setStoryImages(prev => ({
          ...prev,
          [headline]: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000'
        }));
      }
    } catch (error) {
      console.error('Error fetching image:', error);
    }
  };
  
  // Fetch images for all stories in a batch
  const fetchImagesForStories = async (stories: NewsStory[]) => {
    // Fetch images for affirming and challenging stories first
    const allStories = [...affirmingStories, ...challengingStories, ...stories];
    const uniqueHeadlines = Array.from(new Set(allStories.map(story => story.headline)));
    
    // Fetch images for stories that don't already have images
    for (const headline of uniqueHeadlines) {
      if (!storyImages[headline] && !allStories.find(s => s.headline === headline)?.imageUrl) {
        await fetchImageForStory(headline);
      }
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
            return; // Exit early if we found a profile in localStorage
          } catch (parseError) {
            console.error('Error parsing localStorage profile:', parseError);
            // Continue to try server-side profile
          }
        }
      }
      
      // If no localStorage profile or not in browser, try server if authenticated
      if (status !== 'authenticated' || !session) return;
      
      // Use the session email as identifier since NextAuth user might not have id
      const userEmail = session.user?.email;
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
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [status, session]);

  // Function to categorize stories based on user's political profile
  const categorizeStories = (stories: NewsStory[], profile: any) => {
    if (!profile || !stories.length) return;
    
    // Extract key political indicators
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
      // Determine story's political leaning (simplified)
      const storyBias = story.sourceBias?.[0]?.bias || 'center';
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
    
    setAffirmingStories(affirming);
    setChallengingStories(challenging);
    
    console.log(`Categorized ${affirming.length} affirming and ${challenging.length} challenging stories`);
  };

  const fetchNews = async (refresh = false) => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const url = refresh ? "/api/news?refresh=true" : "/api/news";
      const response = await fetch(url, { 
        signal: controller.signal, 
        headers: { 'Cache-Control': 'no-cache' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }
      
      const data = await response.json();
      // Fix property name mismatch - API returns newsStories, not stories
      const stories = data.newsStories || [];
      setNewsStories(stories);
      
      // Fetch user profile if not already loaded
      if (!userPoliticalProfile) {
        await fetchUserProfile();
      }
      
      // Categorize stories if profile is available
      if (userPoliticalProfile) {
        categorizeStories(stories, userPoliticalProfile);
      }
      
      // Fetch images for all stories
      await fetchImagesForStories(stories);
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

  if (status === 'loading') {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading session...</p>
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="empty-state">
        <h1 className="empty-title">Welcome to AI News</h1>
        <p className="empty-description">Please sign in to view the latest news.</p>
        <button className="btn btn-primary" onClick={() => signIn('google')}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-section">
        <div className="page-controls">
          <button className="btn btn-primary" onClick={() => fetchNews(true)} disabled={isLoading}>
            {isLoading ? 'Analyzing News...' : 'Refresh News'}
          </button>
          <a href="/survey" className="btn btn-secondary">Political Survey</a>
        </div>
        
        <div className="political-profile-header">
          <h2>Personalized News Experience</h2>
          <p>Take our <a href="/survey" className="inline-link">political survey</a> to see news that both affirms and challenges your beliefs. This helps you understand different perspectives and avoid echo chambers.</p>
          {userPoliticalProfile ? (
            <div className="profile-status complete">
              <span className="status-icon">✓</span>
              <span>Survey completed! Your news is now personalized.</span>
            </div>
          ) : (
            <div className="profile-status incomplete">
              <span className="status-icon">!</span>
              <span>You haven't taken the survey yet. Complete it to see personalized news.</span>
            </div>
          )}
        </div>
      </div>
      
      {isLoading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Analyzing news for bias patterns...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {!isLoading && !error && newsStories.length === 0 && (
        <div className="empty-state">
          <h2 className="empty-title">No News Stories Loaded</h2>
          <p className="empty-description">Click the Refresh button to load the latest news with AI-powered bias analysis.</p>
        </div>
      )}
      
      {!isLoading && !error && newsStories.length > 0 && (
        <>
          {/* Hero Section with featured story */}
          <section className="hero-section">
            <div className="hero-content">
              <span className="category-tag">Featured</span>
              <h2 className="hero-headline">{newsStories[0].headline}</h2>
              <p className="hero-description">{newsStories[0].summary}</p>
              <div className="bias-indicator">
                <span className={`bias-tag bias-${newsStories[0].sourceBias?.[0]?.bias || 'unknown'}`}>
                  {(newsStories[0].sourceBias?.[0]?.bias || 'unknown').charAt(0).toUpperCase() + 
                   (newsStories[0].sourceBias?.[0]?.bias || 'unknown').slice(1)} Bias
                </span>
                <span className="source-name">{newsStories[0].sources[0]?.source}</span>
              </div>
            </div>
            <div className="hero-image">
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
                <h3 className="subsection-title">Articles That Align With Your Views</h3>
                <div className="news-grid">
                  {affirmingStories.slice(0, 3).map((story, index) => {
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
                                  return (
                                    <div key={i} className="source-item">
                                      <div className="source-header">
                                        <a href={source.link} target="_blank" rel="noopener noreferrer" className="source-link">
                                          <span className="source-name">{source.source}</span>
                                          <span className="link-icon">↗</span>
                                        </a>
                                        <span className={`bias-tag small bias-${bias}`}>
                                          {bias.charAt(0).toUpperCase() + bias.slice(1)}
                                        </span>
                                      </div>
                                      
                                      {source.quote && (
                                        <div className="quote-item">
                                          <p>"{source.quote}"</p>
                                        </div>
                                      )}
                                      
                                      {story.sourceBias && 
                                       story.sourceBias.find(b => b.source === source.source)?.biasQuotes && 
                                       (story.sourceBias.find(b => b.source === source.source)?.biasQuotes?.length || 0) > 0 && (
                                        <div className="bias-evidence">
                                          <h5 className="bias-evidence-title">Bias indicators:</h5>
                                          <ul className="bias-quotes-list">
                                            {story.sourceBias && 
                                             story.sourceBias.find(b => b.source === source.source)?.biasQuotes && 
                                             story.sourceBias.find(b => b.source === source.source)?.biasQuotes
                                              ?.slice(0, 2)
                                              ?.map((quote, qIdx) => (
                                                <li key={qIdx} className="bias-quote">"{quote}"</li>
                                              ))
                                            }
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
              </div>
              
              {/* Challenging News Section */}
              <div className="challenging-news">
                <h3 className="subsection-title">Articles That Challenge Your Views</h3>
                <div className="news-grid">
                  {challengingStories.slice(0, 3).map((story, index) => {
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
                                  return (
                                    <div key={i} className="source-item">
                                      <div className="source-header">
                                        <a href={source.link} target="_blank" rel="noopener noreferrer" className="source-link">
                                          <span className="source-name">{source.source}</span>
                                          <span className="link-icon">↗</span>
                                        </a>
                                        <span className={`bias-tag small bias-${bias}`}>
                                          {bias.charAt(0).toUpperCase() + bias.slice(1)}
                                        </span>
                                      </div>
                                      
                                      {source.quote && (
                                        <div className="quote-item">
                                          <p>"{source.quote}"</p>
                                        </div>
                                      )}
                                      
                                      {story.sourceBias && 
                                       story.sourceBias.find(b => b.source === source.source)?.biasQuotes && 
                                       (story.sourceBias.find(b => b.source === source.source)?.biasQuotes?.length || 0) > 0 && (
                                        <div className="bias-evidence">
                                          <h5 className="bias-evidence-title">Bias indicators:</h5>
                                          <ul className="bias-quotes-list">
                                            {story.sourceBias && 
                                             story.sourceBias.find(b => b.source === source.source)?.biasQuotes && 
                                             story.sourceBias.find(b => b.source === source.source)?.biasQuotes
                                              ?.slice(0, 2)
                                              ?.map((quote, qIdx) => (
                                                <li key={qIdx} className="bias-quote">"{quote}"</li>
                                              ))
                                            }
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
                      
                      {/* Common Facts Section */}
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
                              return (
                                <div key={i} className="source-item">
                                  <div className="source-header">
                                    <a href={source.link} target="_blank" rel="noopener noreferrer" className="source-link">
                                      <span className="source-name">{source.source}</span>
                                      <span className="link-icon">↗</span>
                                    </a>
                                    <span className={`bias-tag small bias-${bias}`}>
                                      {bias.charAt(0).toUpperCase() + bias.slice(1)}
                                    </span>
                                  </div>
                                  
                                  {/* Article quote */}
                                  {source.quote && (
                                    <div className="quote-item">
                                      <p>"{source.quote}"</p>
                                    </div>
                                  )}
                                  
                                  {/* Bias evidence quotes */}
                                  {story.sourceBias && 
                                   story.sourceBias.find(b => b.source === source.source)?.biasQuotes && 
                                   (story.sourceBias.find(b => b.source === source.source)?.biasQuotes?.length || 0) > 0 && (
                                    <div className="bias-evidence">
                                      <h5 className="bias-evidence-title">Bias indicators:</h5>
                                      <ul className="bias-quotes-list">
                                        {story.sourceBias && 
                                         story.sourceBias.find(b => b.source === source.source)?.biasQuotes && 
                                         story.sourceBias.find(b => b.source === source.source)?.biasQuotes
                                          ?.slice(0, 2) // Limit to 2 quotes for space
                                          ?.map((quote, qIdx) => (
                                            <li key={qIdx} className="bias-quote">"{quote}"</li>
                                          ))
                                        }
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
