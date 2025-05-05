import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

// Initialize Anthropic API client
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
  try {
    // Check for query parameters
    const url = new URL(request.url);
    const storyId = url.searchParams.get('storyId');
    const checkAll = url.searchParams.get('checkAll') === 'true';
    
    // If storyId is provided, generate analysis for just that story
    if (storyId) {
      const result = await generateAnalysisForStory(storyId);
      return NextResponse.json(result);
    }
    
    // If checkAll is true, find and process all stories without analysis
    if (checkAll) {
      const results = await processAllMissingAnalysis();
      return NextResponse.json(results);
    }
    
    // Default response if no parameters provided
    return NextResponse.json({ 
      error: 'Missing required parameters. Use storyId or checkAll=true',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  } catch (error) {
    console.error('Error in News Analysis API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate news analysis';
    return NextResponse.json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Find all stories without analysis and generate analysis for them
async function processAllMissingAnalysis() {
  // Get all news stories
  const { data: stories, error: storiesError } = await supabase
    .from('news_stories')
    .select('id, headline, summary, full_content, category, common_facts');
  
  if (storiesError) {
    throw new Error(`Error fetching stories: ${storiesError.message}`);
  }
  
  // Get all story IDs that already have analysis
  const { data: existingAnalysis, error: analysisError } = await supabase
    .from('news_analysis')
    .select('story_id');
  
  if (analysisError) {
    throw new Error(`Error fetching existing analysis: ${analysisError.message}`);
  }
  
  // Create a set of story IDs that already have analysis
  const storiesWithAnalysis = new Set(existingAnalysis.map(a => a.story_id));
  
  // Filter stories that don't have analysis
  const storiesNeedingAnalysis = stories.filter(story => !storiesWithAnalysis.has(story.id));
  
  console.log(`Found ${storiesNeedingAnalysis.length} stories without analysis`);
  
  // Process up to 5 stories at a time to avoid overloading the API
  const batchSize = 5;
  const storiesToProcess = storiesNeedingAnalysis.slice(0, batchSize);
  
  // Generate analysis for each story
  const results = [];
  for (const story of storiesToProcess) {
    try {
      const result = await generateAnalysisForStory(story.id);
      results.push(result);
    } catch (error) {
      console.error(`Error processing story ${story.id}:`, error);
      results.push({
        storyId: story.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    processed: results.length,
    total: storiesNeedingAnalysis.length,
    remaining: storiesNeedingAnalysis.length - results.length,
    results
  };
}

// Generate analysis for a single story
async function generateAnalysisForStory(storyId: string) {
  // Fetch the story details
  const { data: story, error: storyError } = await supabase
    .from('news_stories')
    .select('*')
    .eq('id', storyId)
    .single();
  
  if (storyError) {
    throw new Error(`Error fetching story: ${storyError.message}`);
  }
  
  if (!story) {
    throw new Error(`Story with ID ${storyId} not found`);
  }
  
  // Check if analysis already exists
  const { data: analysisData, error: analysisError } = await supabase
    .from('news_analysis')
    .select('*')
    .eq('story_id', storyId)
    .single();
  
  if (analysisData) {
    return {
      storyId,
      success: true,
      message: 'Analysis already exists',
      analysis: analysisData
    };
  }
  
  // Generate analysis using Anthropic API
  const analysisResult = await generateAlternativeSourcesAndBias(story);
  
  // Check if analysis already exists for this story (second check)
  const { data: existingAnalysisList, error: checkError } = await supabase
    .from('news_analysis')
    .select('*')
    .eq('story_id', storyId);
    
  if (checkError) {
    console.error(`Error checking existing analysis: ${checkError.message}`);
  }
  
  // If analysis already exists, update it instead of inserting
  if (existingAnalysisList && existingAnalysisList.length > 0) {
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('news_analysis')
      .update({
        sources: analysisResult.sources,
        unique_claims: analysisResult.uniqueClaims,
        source_bias: analysisResult.sourceBias,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', storyId)
      .select()
      .single();
      
    if (updateError) {
      throw new Error(`Error updating analysis: ${updateError.message}`);
    }
    
    return {
      storyId,
      success: true,
      message: 'Analysis updated successfully',
      analysis: updatedAnalysis
    };
  } else {
    // Insert new analysis if it doesn't exist
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('news_analysis')
      .insert({
        story_id: storyId,
        sources: analysisResult.sources,
        unique_claims: analysisResult.uniqueClaims,
        source_bias: analysisResult.sourceBias,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (saveError) {
      throw new Error(`Error saving analysis: ${saveError.message}`);
    }
    
    return {
      storyId,
      success: true,
      message: 'Analysis generated and saved successfully',
      analysis: savedAnalysis
    };
  }
  
  // This code is unreachable now as we return inside the if/else blocks above
}

// Use Anthropic to generate alternative sources and bias analysis
async function generateAlternativeSourcesAndBias(story: any) {
  const prompt = `
You are analyzing a news story to identify different perspectives and potential bias. Here's the story:

Headline: ${story.headline}
Summary: ${story.summary}
${story.full_content ? `Full Content: ${story.full_content}` : ''}
${story.common_facts ? `Common Facts: ${story.common_facts}` : ''}
Category: ${story.category || 'General'}

Please provide:
1. Three alternative sources that might cover this story differently, with hypothetical quotes and perspectives
2. Unique claims that different sources might make about this story
3. Analysis of potential bias in different sources' coverage

Format your response as JSON with the following structure:
{
  "sources": [
    {
      "title": "Alternative headline from Source 1",
      "source": "Source 1 name (e.g., CNN, Fox News)",
      "link": "#",
      "content": "Brief article content from this source's perspective"
    },
    // Two more alternative sources
  ],
  "uniqueClaims": [
    {
      "claim": "A specific claim made by one source but not others",
      "source": "Source making this claim"
    },
    // More unique claims
  ],
  "sourceBias": [
    {
      "source": "Source name",
      "bias": "left|right|center",
      "biasQuotes": ["Quote showing bias", "Another quote showing bias"]
    },
    // More source bias analyses
  ]
}

Ensure your response is ONLY the JSON object with no additional text.
`;

  // Call Anthropic API
  const response = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 4000,
    temperature: 0.7,
    system: "You are an expert media analyst who can identify different perspectives and bias in news coverage. You generate realistic alternative news coverage for stories.",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  // Parse the JSON response
  try {
    // Extract the JSON from the response
    // Check the type of content to safely access text
    const contentBlock = response.content[0];
    const content = 'text' in contentBlock ? contentBlock.text : '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Anthropic response");
    }
    
    const analysisData = JSON.parse(jsonMatch[0]);
    
    // Ensure the response has the expected structure
    if (!analysisData.sources || !Array.isArray(analysisData.sources)) {
      analysisData.sources = [];
    }
    
    if (!analysisData.uniqueClaims || !Array.isArray(analysisData.uniqueClaims)) {
      analysisData.uniqueClaims = [];
    }
    
    if (!analysisData.sourceBias || !Array.isArray(analysisData.sourceBias)) {
      analysisData.sourceBias = [];
    }
    
    return analysisData;
  } catch (error) {
    console.error("Error parsing Anthropic response:", error);
    // Safely log the raw response
    const contentBlock = response.content[0];
    const rawText = 'text' in contentBlock ? contentBlock.text : 'No text content available';
    console.log("Raw response:", rawText);
    
    // Return a default structure if parsing fails
    return {
      sources: [],
      uniqueClaims: [],
      sourceBias: []
    };
  }
}
