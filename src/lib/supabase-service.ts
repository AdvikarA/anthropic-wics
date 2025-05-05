import { supabase } from './supabase';
import type { NewsStory, NewsSource, UniqueClaim, SourceBias, BiasQuote } from '../types/news';

// Type definitions for database tables
interface DbNewsStory {
  id: string;
  headline: string;
  summary: string;
  published_at: string | null;
  full_content: string | null;
  category: string | null;
  common_facts: string | null;
  image_url: string | null;
  news_type: string | null; // 'dynamic' or 'static'
  created_at: string;
}

interface DbNewsAnalysis {
  story_id: string;
  sources: NewsSource[];
  unique_claims?: UniqueClaim[];
  source_bias?: SourceBias[];
  created_at?: string;
  updated_at?: string;
}

// New two-table split: news_stories + news_analysis(JSONB)
export async function getNewsStories(): Promise<NewsStory[]> {
  const { data: stories, error: err1 } = await supabase
    .from('news_stories')
    .select('*')
    .order('created_at', { ascending: false });
  if (err1) throw err1;
  const ids = stories.map(s => s.id);
  const { data: analysisList, error: err2 } = await supabase
    .from('news_analysis')
    .select('story_id,sources,unique_claims,source_bias')
    .in('story_id', ids);
  if (err2) throw err2;
  const analysisMap = Object.fromEntries(
    analysisList.map(a => [a.story_id, a])
  );
  return stories.map(s => {
    const a = analysisMap[s.id] || {} as DbNewsAnalysis;
    return {
      id: s.id,
      headline: s.headline,
      summary: s.summary,
      publishedAt: s.published_at || undefined,
      fullContent: s.full_content || undefined,
      category: s.category || undefined,
      commonFacts: s.common_facts || undefined,
      imageUrl: s.image_url || undefined,
      news_type: s.news_type || 'static',
      sources: a.sources,
      uniqueClaims: a.unique_claims,
      sourceBias: a.source_bias
    };
  });
}

// Get news stories by category
export async function getNewsByCategory(category: string): Promise<NewsStory[]> {
  const { data: stories, error: err1 } = await supabase
    .from('news_stories')
    .select('*')
    .eq('category', category.toLowerCase())
    .order('created_at', { ascending: false });
  
  if (err1) throw err1;
  
  if (!stories || stories.length === 0) {
    return [];
  }
  
  const ids = stories.map(s => s.id);
  const { data: analysisList, error: err2 } = await supabase
    .from('news_analysis')
    .select('story_id,sources,unique_claims,source_bias')
    .in('story_id', ids);
  
  if (err2) throw err2;
  
  const analysisMap = Object.fromEntries(
    (analysisList || []).map(a => [a.story_id, a])
  );
  
  return stories.map(s => {
    const a = analysisMap[s.id] || {} as DbNewsAnalysis;
    return {
      id: s.id,
      headline: s.headline,
      summary: s.summary,
      publishedAt: s.published_at || undefined,
      fullContent: s.full_content || undefined,
      category: s.category || undefined,
      commonFacts: s.common_facts || undefined,
      imageUrl: s.image_url || undefined,
      news_type: s.news_type || 'static',
      sources: a.sources,
      uniqueClaims: a.unique_claims,
      sourceBias: a.source_bias
    };
  });
}

// Find stories without analysis
export async function findStoriesWithoutAnalysis(): Promise<DbNewsStory[]> {
  // Get all news stories
  const { data: stories, error: storiesError } = await supabase
    .from('news_stories')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (storiesError) throw storiesError;
  
  // Get all story IDs that already have analysis
  const { data: existingAnalysis, error: analysisError } = await supabase
    .from('news_analysis')
    .select('story_id');
  
  if (analysisError) throw analysisError;
  
  // Create a set of story IDs that already have analysis
  const storiesWithAnalysis = new Set(existingAnalysis.map(a => a.story_id));
  
  // Filter stories that don't have analysis
  return stories.filter(story => !storiesWithAnalysis.has(story.id));
}

export async function saveNewsStory(story: NewsStory): Promise<string | null> {
  try {
    // Generate a UUID if the story doesn't have an ID
    const storyId = crypto.randomUUID();
    
    // Insert into news_stories table
    const { data, error: e1 } = await supabase
      .from('news_stories')
      .upsert({
        id: storyId,
        headline: story.headline,
        summary: story.summary,
        published_at: story.publishedAt || null,
        full_content: story.fullContent || null,
        category: story.category || null,
        common_facts: story.commonFacts || null,
        image_url: story.imageUrl || null,
        news_type: (story as any).news_type || 'static' // Add news_type field
      })
      .select('id')
      .single();
      
    if (e1) {
      console.error('Error saving to news_stories:', e1);
      throw e1;
    }
    
    // Insert into news_analysis table
    const { error: e2 } = await supabase
      .from('news_analysis')
      .upsert({
        story_id: data.id,
        sources: story.sources || [],
        unique_claims: story.uniqueClaims || null,
        source_bias: story.sourceBias || null
      }, { onConflict: 'story_id' });
      
    if (e2) {
      console.error('Error saving to news_analysis:', e2);
      throw e2;
    }
    
    console.log('Successfully saved story and analysis with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error in saveNewsStory:', error);
    return null;
  }
}
