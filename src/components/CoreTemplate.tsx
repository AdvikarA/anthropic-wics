"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { useAuth } from '../context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

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

interface CoreTemplateProps {
  children?: ReactNode;
  title: string;
  description?: string;
  showControls?: boolean;
  onLoadStored?: () => void;
  onFetchLive?: () => void;
  onGenerateAnalysis?: () => void;
  isLoading?: boolean;
  error?: string | null;
  showSurveyLink?: boolean;
  heroStory?: NewsStory;
  showHero?: boolean;
}

export default function CoreTemplate({
  children,
  title,
  description,
  showControls = true,
  onLoadStored,
  onFetchLive,
  onGenerateAnalysis,
  isLoading = false,
  error = null,
  showSurveyLink = true,
  heroStory,
  showHero = true
}: CoreTemplateProps) {
  const { user, signInWithGoogle } = useAuth();

  if (!user) {
    return (
      <div className="empty-state">
        <h1 className="empty-title">Welcome to AI News</h1>
        <p className="empty-description">Please sign in to view {title}.</p>
        <button className="btn btn-primary" onClick={() => signInWithGoogle()}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-section">
        {showControls && (
          <div className="page-controls">
            {onLoadStored && (
              <button 
                className="btn btn-primary" 
                onClick={onLoadStored} 
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load Stored News'}
              </button>
            )}
            
            {onFetchLive && (
              <button 
                className="btn btn-secondary ml-2" 
                onClick={onFetchLive} 
                disabled={isLoading}
              >
                {isLoading ? 'Fetching...' : 'Fetch Live News'}
              </button>
            )}
            
            {onGenerateAnalysis && (
              <button 
                className="btn btn-secondary ml-2" 
                onClick={onGenerateAnalysis}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Generate Missing Analysis'}
              </button>
            )}
            
            {showSurveyLink && (
              <Link href="/survey" className="btn btn-secondary ml-2">
                Political Survey
              </Link>
            )}
          </div>
        )}
        
        <div className="category-header">
          <h1 className="category-title capitalize">{title}</h1>
          {description && (
            <p className="category-description">{description}</p>
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
      
      {showHero && heroStory && (
        <section className="hero-section">
          <div className="hero-content">
            <span className="category-tag capitalize">{heroStory.category || 'Featured'}</span>
            <h2 className="hero-headline">{heroStory.headline}</h2>
            <p className="hero-description">{heroStory.summary}</p>
            {heroStory.sourceBias && heroStory.sourceBias.length > 0 && (
              <div className="bias-indicator">
                <span className={`bias-tag bias-${heroStory.sourceBias[0]?.bias || 'unknown'}`}>
                  {(heroStory.sourceBias[0]?.bias || 'unknown').charAt(0).toUpperCase() + 
                  (heroStory.sourceBias[0]?.bias || 'unknown').slice(1)} Bias
                </span>
                {heroStory.sources && heroStory.sources.length > 0 && (
                  <span className="source-name">{heroStory.sources[0]?.source}</span>
                )}
              </div>
            )}
          </div>
          <div className="hero-image">
            <div className="matrix-overlay"></div>
            {heroStory.imageUrl ? (
              <Image 
                src={heroStory.imageUrl} 
                alt={heroStory.headline} 
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
      )}
      
      {children}
    </div>
  );
}
