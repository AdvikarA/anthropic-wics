import { NextResponse } from 'next/server';
import axios from 'axios';
import { Anthropic } from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { saveNewsStory } from '@/lib/supabase-service';

// Initialize APIs
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

if (!NEWS_API_KEY) {
  console.error('NEWS_API_KEY environment variable is not set');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
  try {
    // Extract category from URL
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    
    if (!category) {
      return NextResponse.json({ 
        error: 'Category parameter is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    // Normalize category name to match NewsAPI values
    const normalizedCategory = normalizeCategory(category);
    
    console.log(`Fetching live news for category: ${normalizedCategory}`);
    
    // Fetch news from NewsAPI for the specific category
    const newsApiUrl = `${NEWS_API_BASE_URL}/top-headlines?category=${normalizedCategory}&language=en&pageSize=10&apiKey=${NEWS_API_KEY}`;
    
    const response = await axios.get(newsApiUrl, {
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    const articles = response.data.articles || [];
    console.log(`Fetched ${articles.length} articles from NewsAPI for category ${normalizedCategory}`);
    
    if (articles.length === 0) {
      return NextResponse.json({ 
        newsStories: [],
        category: normalizedCategory,
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
    
    // Process and save articles to Supabase
    const processedStories = [];
    for (const article of articles) {
      try {
        // Skip articles without title or content
        if (!article.title || !article.description) {
          continue;
        }
        
        // Create a news story object
        const story = {
          headline: article.title,
          summary: article.description,
          fullContent: article.content || article.description,
          category: normalizedCategory,
          publishedAt: article.publishedAt || new Date().toISOString(),
          imageUrl: article.urlToImage || null,
          sources: [],
          uniqueClaims: [],
          sourceBias: []
        };
        
        // Save to Supabase and get ID
        const storyId = await saveNewsStory(story);
        if (storyId) {
          // Add ID to the story object
          const storyWithId = { ...story, id: storyId };
          processedStories.push(storyWithId);
          
          // Generate analysis for this story
          await generateAnalysisForStory(storyId);
        }
      } catch (error) {
        console.error('Error processing article:', error);
      }
    }
    
    // Fetch the stories with analysis from Supabase
    const { data: stories, error: storiesError } = await supabase
      .from('news_stories')
      .select('*')
      .eq('category', normalizedCategory)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (storiesError) {
      throw new Error(`Error fetching stories by category: ${storiesError.message}`);
    }
    
    // Get the IDs of all stories
    const storyIds = stories.map(story => story.id);
    
    // Fetch analysis for these stories
    const { data: analysisList, error: analysisError } = await supabase
      .from('news_analysis')
      .select('*')
      .in('story_id', storyIds);
    
    if (analysisError) {
      throw new Error(`Error fetching analysis for stories: ${analysisError.message}`);
    }
    
    // Create a map of story ID to analysis
    const analysisMap = Object.fromEntries(
      (analysisList || []).map(analysis => [analysis.story_id, analysis])
    );
    
    // Combine stories with their analysis
    const newsStories = stories.map(story => {
      const analysis = analysisMap[story.id] || {};
      
      return {
        id: story.id,
        headline: story.headline,
        summary: story.summary,
        publishedAt: story.published_at || undefined,
        fullContent: story.full_content || undefined,
        category: story.category || undefined,
        commonFacts: story.common_facts || undefined,
        imageUrl: story.image_url || undefined,
        news_type: story.news_type || 'dynamic',
        sources: analysis.sources || [],
        uniqueClaims: analysis.unique_claims || [],
        sourceBias: analysis.source_bias || []
      };
    });
    
    return NextResponse.json({ 
      newsStories,
      category: normalizedCategory,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Error in Live Category News API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news by category';
    return NextResponse.json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to normalize category names for NewsAPI
function normalizeCategory(category: string): string {
  // Map of common variations to standardized NewsAPI category names
  const categoryMap: {[key: string]: string} = {
    'tech': 'technology',
    'technology': 'technology',
    'business': 'business',
    'economy': 'business',
    'finance': 'business',
    'politics': 'politics',
    'political': 'politics',
    'policy': 'politics',
    'science': 'science',
    'scientific': 'science',
    'health': 'health',
    'healthcare': 'health',
    'medical': 'health',
    'sports': 'sports',
    'sport': 'sports',
    'entertainment': 'entertainment',
    'world': 'general',
    'international': 'general',
    'global': 'general',
    'us': 'general',
    'usa': 'general',
    'america': 'general',
    'social': 'general',
    'lifestyle': 'general'
  };
  
  // NewsAPI only supports these categories
  const validNewsApiCategories = [
    'business', 'entertainment', 'general', 
    'health', 'science', 'sports', 'technology'
  ];
  
  const normalized = categoryMap[category.toLowerCase()];
  
  // If the normalized category is not valid for NewsAPI, use 'general'
  if (!normalized || !validNewsApiCategories.includes(normalized)) {
    return 'general';
  }
  
  return normalized;
}

// Generate analysis for a story
async function generateAnalysisForStory(storyId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/news/analysis?storyId=${storyId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate analysis: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating analysis:', error);
    throw error;
  }
}
