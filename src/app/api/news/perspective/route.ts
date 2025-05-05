import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    // Check if Supabase environment variables are set
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Extract query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all'; // 'align', 'challenge', or 'all'
    const refresh = url.searchParams.get('refresh') === 'true';
    const userEmail = url.searchParams.get('userEmail');
    
    // Validate required parameters
    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }
    
    // Fetch user's political profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('political_axes, political_type')
      .eq('email', userEmail)
      .single();
    
    if (userError || !userData) {
      console.error('Error fetching user profile:', userError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Extract user's political leanings
    const politicalAxes = userData.political_axes || {};
    const libertyScore = politicalAxes.libertyScore || 0;
    const socialScore = politicalAxes.socialScore || 0;
    
    // Calculate user's overall political leaning (-10 to 10 scale)
    // Higher values = more progressive/left, Lower values = more conservative/right
    const userPoliticalLeaning = socialScore; // Using social score as primary indicator
    
    console.log(`User ${userEmail} political leaning: ${userPoliticalLeaning}`);
    
    // Fetch all news stories from the database
    const { data: stories, error: storiesError } = await supabase
      .from('news_stories')
      .select('*, news_analysis(sources, source_bias)')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (storiesError) {
      console.error('Error fetching news stories:', storiesError);
      return NextResponse.json({ error: 'Failed to fetch news stories' }, { status: 500 });
    }
    
    if (!stories || stories.length === 0) {
      return NextResponse.json({ 
        aligningStories: [],
        challengingStories: [],
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
    
    // Process stories to include their analysis data
    const processedStories = stories.map(story => {
      const analysis = story.news_analysis || {};
      
      return {
        id: story.id,
        headline: story.headline,
        summary: story.summary,
        publishedAt: story.published_at,
        category: story.category,
        imageUrl: story.image_url,
        sources: analysis.sources || [],
        sourceBias: analysis.source_bias || []
      };
    });
    
    // Categorize stories based on user's political leaning
    const aligningStories = [];
    const challengingStories = [];
    
    for (const story of processedStories) {
      // Skip stories with no source bias information
      if (!story.sourceBias || story.sourceBias.length === 0) continue;
      
      // Calculate average bias of the story's sources
      let storyBiasValue = 0;
      let biasCount = 0;
      
      for (const sourceBias of story.sourceBias) {
        if (sourceBias.bias === 'left') {
          storyBiasValue += 7; // Left-leaning sources get a high value
          biasCount++;
        } else if (sourceBias.bias === 'right') {
          storyBiasValue += 3; // Right-leaning sources get a low value
          biasCount++;
        } else if (sourceBias.bias === 'center') {
          storyBiasValue += 5; // Center sources get a middle value
          biasCount++;
        }
      }
      
      // Calculate average bias if we have any valid bias values
      const avgStoryBias = biasCount > 0 ? storyBiasValue / biasCount : 5;
      
      // Convert to -10 to 10 scale to match user's political leaning
      const normalizedStoryBias = (avgStoryBias - 5) * 2;
      
      // Calculate difference between user's leaning and story bias
      // Small difference = aligning, Large difference = challenging
      const difference = Math.abs(userPoliticalLeaning - normalizedStoryBias);
      
      // Add story to appropriate category
      // Stories with bias similar to user's leaning are "aligning"
      // Stories with bias different from user's leaning are "challenging"
      if (difference < 7) {
        aligningStories.push(story);
      } else {
        challengingStories.push(story);
      }
    }
    
    // Filter results based on requested type
    let result: any = {};
    
    if (type === 'align' || type === 'all') {
      result.aligningStories = aligningStories.slice(0, 10); // Limit to 10 stories
    }
    
    if (type === 'challenge' || type === 'all') {
      result.challengingStories = challengingStories.slice(0, 10); // Limit to 10 stories
    }
    
    result.timestamp = new Date().toISOString();
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in perspective news API:', error);
    return NextResponse.json({ 
      error: 'Failed to process news perspective request',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
