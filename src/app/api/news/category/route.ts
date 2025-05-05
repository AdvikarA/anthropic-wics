import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    
    // Normalize category name to match database values
    const normalizedCategory = normalizeCategory(category);
    
    // Fetch stories with the specified category
    const { data: stories, error: storiesError } = await supabase
      .from('news_stories')
      .select('*')
      .eq('category', normalizedCategory)
      .order('created_at', { ascending: false });
    
    if (storiesError) {
      throw new Error(`Error fetching stories by category: ${storiesError.message}`);
    }
    
    // If no stories found for this category, return empty array
    if (!stories || stories.length === 0) {
      return NextResponse.json({ 
        newsStories: [],
        category: normalizedCategory,
        timestamp: new Date().toISOString()
      }, { status: 200 });
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
        news_type: story.news_type || 'static',
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
    console.error('Error in Category News API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news by category';
    return NextResponse.json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to normalize category names
function normalizeCategory(category: string): string {
  // Map of common variations to standardized category names
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
    'world': 'world',
    'international': 'world',
    'global': 'world',
    'us': 'us',
    'usa': 'us',
    'america': 'us',
    'social': 'social',
    'lifestyle': 'social'
  };
  
  const normalized = categoryMap[category.toLowerCase()];
  return normalized || category.toLowerCase();
}
