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
  created_at: string;
  updated_at: string;
}

interface DbNewsSource {
  id: string;
  story_id: string;
  title: string;
  source: string;
  link: string;
  created_at: string;
}

interface DbUniqueClaim {
  id: string;
  story_id: string;
  source: string;
  claims: string;
  bias: string | null;
  created_at: string;
}

interface DbSourceBias {
  id: string;
  story_id: string;
  source: string;
  bias: string;
  created_at: string;
}

interface DbBiasQuote {
  id: string;
  source_bias_id: string;
  quote: string;
  created_at: string;
}

// Convert database objects to application objects
function dbToNewsStory(
  story: DbNewsStory, 
  sources: DbNewsSource[], 
  claims: DbUniqueClaim[],
  sourceBiases: DbSourceBias[],
  biasQuotes: Record<string, DbBiasQuote[]>
): NewsStory {
  // Convert sources
  const newsSources: NewsSource[] = sources.map(source => ({
    title: source.title,
    source: source.source,
    link: source.link
  }));

  // Convert unique claims
  const uniqueClaims: UniqueClaim[] = claims.map(claim => ({
    source: claim.source,
    claims: claim.claims,
    bias: claim.bias as 'left' | 'right' | 'center' | 'unknown' | undefined
  }));

  // Convert source biases with their quotes
  const sourceBiasArray: SourceBias[] = sourceBiases.map(bias => {
    const quotes = biasQuotes[bias.id] || [];
    return {
      source: bias.source,
      bias: bias.bias as 'left' | 'right' | 'center' | 'unknown',
      biasQuotes: quotes.map(q => q.quote)
    };
  });

  return {
    headline: story.headline,
    summary: story.summary,
    sources: newsSources,
    publishedAt: story.published_at || undefined,
    fullContent: story.full_content || undefined,
    category: story.category || undefined,
    commonFacts: story.common_facts || undefined,
    uniqueClaims: uniqueClaims.length > 0 ? uniqueClaims : undefined,
    sourceBias: sourceBiasArray.length > 0 ? sourceBiasArray : undefined
  };
}

// Service functions
export async function getNewsStories(): Promise<NewsStory[]> {
  try {
    // Fetch news stories from Supabase
    const { data: stories, error: storiesError } = await supabase
      .from('news_stories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (storiesError) {
      // If the error is that the table doesn't exist, return an empty array
      if (storiesError.code === '42P01') {
        console.error('Error fetching news stories: Table does not exist', storiesError);
        return [];
      }
      console.error('Error fetching news stories:', storiesError);
      return [];
    }
    // Create a map to store related data for each story
    const storyMap: Record<string, {
      story: DbNewsStory,
      sources: DbNewsSource[],
      claims: DbUniqueClaim[],
      sourceBiases: DbSourceBias[],
      biasQuotes: Record<string, DbBiasQuote[]>
    }> = {};

    // Initialize the map with stories
    stories.forEach(story => {
      storyMap[story.id] = {
        story: story as DbNewsStory,
        sources: [],
        claims: [],
        sourceBiases: [],
        biasQuotes: {}
      };
    });

    // Fetch all sources for these stories
    const storyIds = stories.map(s => s.id);
    const { data: sources, error: sourcesError } = await supabase
      .from('news_sources')
      .select('*')
      .in('story_id', storyIds);

    if (sourcesError) throw sourcesError;
    if (sources) {
      sources.forEach(source => {
        if (storyMap[source.story_id]) {
          storyMap[source.story_id].sources.push(source as DbNewsSource);
        }
      });
    }

    // Fetch all unique claims
    const { data: claims, error: claimsError } = await supabase
      .from('unique_claims')
      .select('*')
      .in('story_id', storyIds);

    if (claimsError) throw claimsError;
    if (claims) {
      claims.forEach(claim => {
        if (storyMap[claim.story_id]) {
          storyMap[claim.story_id].claims.push(claim as DbUniqueClaim);
        }
      });
    }

    // Fetch all source biases
    const { data: biases, error: biasesError } = await supabase
      .from('source_bias')
      .select('*')
      .in('story_id', storyIds);

    if (biasesError) throw biasesError;
    
    // If we have biases, fetch their quotes
    if (biases && biases.length > 0) {
      const biasIds = biases.map(b => b.id);
      
      // Add biases to the story map
      biases.forEach(bias => {
        if (storyMap[bias.story_id]) {
          storyMap[bias.story_id].sourceBiases.push(bias as DbSourceBias);
        }
      });

      // Fetch quotes for these biases
      const { data: quotes, error: quotesError } = await supabase
        .from('bias_quotes')
        .select('*')
        .in('source_bias_id', biasIds);

      if (quotesError) throw quotesError;
      if (quotes) {
        // Group quotes by source_bias_id
        quotes.forEach(quote => {
          // Find which story this bias belongs to
          for (const storyId in storyMap) {
            const bias = storyMap[storyId].sourceBiases.find(b => b.id === quote.source_bias_id);
            if (bias) {
              if (!storyMap[storyId].biasQuotes[bias.id]) {
                storyMap[storyId].biasQuotes[bias.id] = [];
              }
              storyMap[storyId].biasQuotes[bias.id].push(quote as DbBiasQuote);
              break;
            }
          }
        });
      }
    }

    // Convert to NewsStory objects
    return Object.values(storyMap).map(({ story, sources, claims, sourceBiases, biasQuotes }) => 
      dbToNewsStory(story, sources, claims, sourceBiases, biasQuotes)
    );
  } catch (error: unknown) {
    const err = error as any;
    // If the error is that the table doesn't exist, return an empty array
    if (err.code === '42P01') {
      console.error('Error fetching news stories: Table does not exist', err);
      return [];
    }
    console.error('Error fetching news stories:', error);
    return [];
  }
}

export async function saveNewsStory(story: NewsStory): Promise<string | null> {
  try {
    // Insert the news story
    const { data: storyData, error: storyError } = await supabase
      .from('news_stories')
      .insert({
        headline: story.headline,
        summary: story.summary,
        published_at: story.publishedAt || null,
        full_content: story.fullContent || null,
        category: story.category || null,
        common_facts: story.commonFacts || null
      })
      .select('id')
      .single();

    if (storyError) throw storyError;
    if (!storyData) throw new Error('Failed to insert news story');

    const storyId = storyData.id;

      // Insert sources
    if (story.sources && story.sources.length > 0) {
      const sourcesToInsert = story.sources.map((source: NewsSource) => ({
        story_id: storyId,
        title: source.title,
        source: source.source,
        link: source.link
      }));

      const { error: sourcesError } = await supabase
        .from('news_sources')
        .insert(sourcesToInsert);

      if (sourcesError) throw sourcesError;
    }

    // Insert unique claims
    if (story.uniqueClaims && story.uniqueClaims.length > 0) {
      const claimsToInsert = story.uniqueClaims.map((claim: UniqueClaim) => ({
        story_id: storyId,
        source: claim.source,
        claims: claim.claims,
        bias: claim.bias || null
      }));

      const { error: claimsError } = await supabase
        .from('unique_claims')
        .insert(claimsToInsert);

      if (claimsError) throw claimsError;
    }

    // Insert source biases and their quotes
    if (story.sourceBias && story.sourceBias.length > 0) {
      for (const bias of story.sourceBias) {
        // Insert the bias
        const { data: biasData, error: biasError } = await supabase
          .from('source_bias')
          .insert({
            story_id: storyId,
            source: bias.source,
            bias: bias.bias
          })
          .select('id')
          .single();

        if (biasError) throw biasError;
        if (!biasData) continue;

        // Insert quotes for this bias
        if (bias.biasQuotes && bias.biasQuotes.length > 0) {
          const quotesToInsert = bias.biasQuotes.map((quote: string) => ({
            source_bias_id: biasData.id,
            quote: quote
          }));

          const { error: quotesError } = await supabase
            .from('bias_quotes')
            .insert(quotesToInsert);

          if (quotesError) throw quotesError;
        }
      }
    }

    return storyId;
  } catch (error) {
    console.error('Error saving news story:', error);
    return null;
  }
}
