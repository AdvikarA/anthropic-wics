import { NextResponse } from 'next/server';
import axios from 'axios';
import { Anthropic } from '@anthropic-ai/sdk';

// Initialize APIs
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2';

if (!NEWS_API_KEY) {
  console.error('NEWS_API_KEY environment variable is not set');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
  // Variable to track if we need to clean up a timeout
  let timeoutId: NodeJS.Timeout | null = null;
  const clearTimeoutFn = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  try {
    // Check for a refresh query parameter to determine if we should fetch new data
    const url = new URL(request.url);
    const shouldRefresh = url.searchParams.get('refresh') === 'true';
    
    if (!shouldRefresh) {
      console.log('No refresh parameter found, returning empty news stories');
      return NextResponse.json({ 
        newsStories: [],
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
    
    console.log('Refresh parameter found, fetching news...');
    
    // Try to import the Supabase service to fetch news stories
    let getNewsStories: any = null;
    let saveNewsStory: any = null;
    
    try {
      const supabaseService = await import('@/lib/supabase-service');
      getNewsStories = supabaseService.getNewsStories;
      saveNewsStory = supabaseService.saveNewsStory;
      
      // If there are stories in Supabase, return them
      if (typeof getNewsStories === 'function') {
        try {
          const existingStories = await getNewsStories();
          if (existingStories && existingStories.length > 0) {
            console.log(`Found ${existingStories.length} existing stories in Supabase`);
            return NextResponse.json({ 
              newsStories: existingStories,
              timestamp: new Date().toISOString()
            }, { status: 200 });
          }
        } catch (dbError) {
          console.error('Error fetching from Supabase:', dbError);
          // Continue to fallback if Supabase fails
        }
      }
    } catch (importError) {
      console.error('Error importing Supabase service:', importError);
      // Continue to fallback if import fails
    }
    
    if (!shouldRefresh) {
      console.log('No refresh parameter found, returning empty news stories');
      return NextResponse.json({ 
        newsStories: [],
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }
    
    console.log('Refresh parameter found, fetching from NewsAPI...');
    
    // Set a timeout for the entire request
    const requestTimeout = 60000; // 60 seconds
    
    // Create a promise that rejects after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Request timed out after 60 seconds'));
      }, requestTimeout);
    });
    
    console.log('Fetching news from NewsAPI...');
    console.log('Using NewsAPI key:', NEWS_API_KEY ? 'Key is set' : 'Key is NOT set');

    // First, collect all articles from different sources
    let allArticles: any[] = [];
    
    // Fetch news from multiple sources with emphasis on US and political sources
    const sources = [
      'cnn',
      'fox-news',
      'the-washington-post',
      'politico',
      'nbc-news',
      'abc-news',
      'bbc-news',
      'reuters',
      'associated-press',
      'bloomberg',
      'the-wall-street-journal'
    ];
    
    // Fetch top headlines from each source
    for (const source of sources) {
      try {
        console.log(`Fetching headlines from ${source}...`);
        const sourceUrl = `${NEWS_API_BASE_URL}/top-headlines?sources=${source}&pageSize=10&apiKey=${NEWS_API_KEY}`;
        
        // Configure axios with proper timeout and no signal
        const response = await axios.get(sourceUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        const data = response.data;
        
        if (data.articles && data.articles.length > 0) {
          console.log(`Got ${data.articles.length} articles from ${source}`);
          
          // Add source info to each article
          data.articles.forEach((article: any) => {
            if (article.title && article.url) {
              // Extract keywords from title and description
              const keywords = extractKeywords(article.title + ' ' + (article.description || ''));
              
              // Analyze bias in the article
              const biasAnalysis = analyzeArticleBias(
                article.title, 
                article.description || '', 
                article.content || ''
              );
              
              // Debug the bias analysis results
              console.log(`Bias analysis for ${source}:`, {
                title: article.title.substring(0, 30) + '...',
                bias: biasAnalysis.bias,
                quoteCount: biasAnalysis.biasQuotes.length,
                sampleQuote: biasAnalysis.biasQuotes[0]?.substring(0, 50) + '...'
              });
              
              allArticles.push({
                ...article,
                sourceId: source,
                keywords: keywords,
                bias: biasAnalysis.bias,
                biasQuotes: biasAnalysis.biasQuotes
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error);
      }
    }
    
    console.log(`Collected ${allArticles.length} total articles from all sources`);
    
    // If no articles were collected, return empty array instead of using fallback data
    if (allArticles.length === 0) {
      console.log('No articles collected, likely due to rate limiting.');
      return NextResponse.json({ 
        newsStories: [],
        timestamp: new Date().toISOString(),
        error: 'Rate limit exceeded or no articles available'
      }, { status: 200 });
    }
    
    // Group similar articles together
    const newsEvents: any[] = [];
  
    for (const article of allArticles) {
      let foundMatch = false;
      
      // Check if this article belongs to an existing event
      for (const event of newsEvents) {
        if (event.articles.some((existingArticle: any) => areArticlesSimilar(existingArticle, article))) {
          // Check if this source is already in the event
          const sourceExists = event.articles.some((existingArticle: any) => 
            existingArticle.source?.name === article.source?.name
          );
          
          // Only add if it's from a different source
          if (!sourceExists) {
            event.articles.push(article);
          }
          foundMatch = true;
          break;
        }
      }
      
      // If no match found, create a new event
      if (!foundMatch) {
        newsEvents.push({
          articles: [article],
          category: determineNewsCategory(article.title, article.description, extractKeywords(article.title + ' ' + article.description))
        });
      }
    }
    
    // Process the events to create news stories
    const newsStories: any[] = [];
    
    // Process events with at least 3 sources (for better comparison)
    const multiSourceEvents = newsEvents.filter(event => event.articles.length >= 3);
    console.log(`Found ${multiSourceEvents.length} events with at least 3 sources`);
    
    // If not enough multi-source events, include some with fewer sources
    const eventsToProcess = multiSourceEvents.length >= 5 ? 
      multiSourceEvents.slice(0, 10) : 
      [...multiSourceEvents, ...newsEvents.filter(event => event.articles.length >= 2).slice(0, 10 - multiSourceEvents.length)];
    
    console.log(`Processing ${eventsToProcess.length} news events`);
    
    // Process each event to create a news story
    for (const event of eventsToProcess) {
      // Use the most detailed article as the main one
      const mainArticle = event.articles.reduce((best: any, current: any) => {
        const bestLength = (best.content?.length || 0) + (best.description?.length || 0);
        const currentLength = (current.content?.length || 0) + (current.description?.length || 0);
        return currentLength > bestLength ? current : best;
      }, event.articles[0]);
      
      // Create sources list
      const sources = event.articles.map((article: any) => ({
        title: article.title,
        source: article.source?.name || article.sourceId,
        link: article.url
      }));
      
      // Generate a summary and extract common facts and unique claims
      let summary = mainArticle.description || '';
      let commonFacts = '';
      const uniqueClaims: any[] = [];
      
      // Process source bias information
      const sourceBiasInfo: {source: string; bias: 'left' | 'right' | 'center' | 'unknown'; biasQuotes: string[]}[] = [];
      
      // Debug log to check if articles have bias information
      console.log('Checking for bias in articles:', event.articles.length, 'articles');
      
      for (const article of event.articles) {
        // Debug log for each article
        console.log('Article source:', article.source?.name || article.sourceId);
        console.log('Has bias info:', !!article.bias, 'Has bias quotes:', !!(article.biasQuotes && article.biasQuotes.length > 0));
        
        if (article.sourceId && article.bias && article.biasQuotes && article.biasQuotes.length > 0) {
          // Find the source name from the article
          const sourceName = article.source?.name || article.sourceId;
          
          // Add to source bias info if not already added
          if (!sourceBiasInfo.some(sb => sb.source === sourceName)) {
            sourceBiasInfo.push({
              source: sourceName,
              bias: article.bias,
              biasQuotes: article.biasQuotes
            });
            console.log('Added bias info for source:', sourceName, 'with bias:', article.bias, 'and quotes:', article.biasQuotes.length);
          }
        }
      }
      
      // Log the final sourceBiasInfo
      console.log('Total sources with bias info:', sourceBiasInfo.length);
      
      // Add to news stories
      const newsStory = {
        headline: mainArticle.title,
        summary: summary,
        sources: sources,
        publishedAt: mainArticle.publishedAt,
        mainKeywords: mainArticle.keywords,
        category: event.category,
        commonFacts: commonFacts,
        uniqueClaims: uniqueClaims,
        sourceBias: sourceBiasInfo
      };
      
      newsStories.push(newsStory);
      
      // Save to Supabase if the function is available
      if (typeof saveNewsStory === 'function') {
        try {
          await saveNewsStory(newsStory);
          console.log(`Saved story to Supabase: ${mainArticle.title.substring(0, 30)}...`);
        } catch (saveError) {
          console.error('Error saving to Supabase:', saveError);
        }
      } else {
        console.log('Skipping Supabase save - saveNewsStory function not available');
      }
    }
    
    // Return the news stories
    clearTimeoutFn(); // Clear the timeout before returning
    return NextResponse.json({ 
      newsStories,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    // Clear the timeout if there was an error
    try {
      // Only clear timeout if we're in the NewsAPI fetch path
      if (typeof clearTimeoutFn === 'function') {
        clearTimeoutFn();
      }
    } catch (e) {
      // Ignore errors in cleanup
    }
    
    console.error('Error in News API:', error);
    
    // Return a more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news';
    return NextResponse.json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions (copied from original file)
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Remove common stop words
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
  ];
  
  // Normalize text
  const normalizedText = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  // Split into words and filter
  const words = normalizedText.split(' ')
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Count word frequencies
  const wordCounts: {[key: string]: number} = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  // Sort by frequency
  const sortedWords = Object.keys(wordCounts).sort((a, b) => wordCounts[b] - wordCounts[a]);
  
  // Return top keywords (up to 10)
  return sortedWords.slice(0, 10);
}

// Helper function to analyze article bias and extract relevant quotes
function analyzeArticleBias(title: string, description: string, content: string | null): { bias: 'left' | 'right' | 'center' | 'unknown', biasQuotes: string[] } {
  // Combine all text for analysis
  const fullText = [title, description, content].filter(Boolean).join(' ');
  
  // Initialize result
  const result = {
    bias: 'unknown' as 'left' | 'right' | 'center' | 'unknown',
    biasQuotes: [] as string[]
  };
  
  // Define bias indicators - expanded for better detection
  const leftBiasTerms = [
    'progressive', 'liberal', 'democrat', 'social justice', 'equality', 'climate change', 
    'green', 'environmental', 'diversity', 'inclusion', 'marginalized', 'systemic', 'reform',
    'regulation', 'workers', 'union', 'universal healthcare', 'gun control', 'reproductive rights',
    'welfare', 'public option', 'medicare for all', 'wealth tax', 'income inequality', 'living wage',
    'affordable housing', 'student loan forgiveness', 'police reform', 'defund', 'progressive',
    'racial justice', 'gender equality', 'LGBTQ+', 'transgender', 'pronouns', 'privilege',
    'structural racism', 'equity', 'affirmative action', 'reparations'
  ];
  
  const rightBiasTerms = [
    'conservative', 'republican', 'traditional', 'freedom', 'liberty', 'patriot', 'america first',
    'free market', 'deregulation', 'tax cuts', 'small government', 'second amendment', 'pro-life',
    'border security', 'illegal immigration', 'law and order', 'family values', 'religious liberty',
    'constitutional', 'founding fathers', 'heritage', 'individual responsibility', 'school choice',
    'tough on crime', 'national security', 'military strength', 'fiscal responsibility',
    'private sector', 'job creators', 'limited government', 'states rights', 'voter ID',
    'traditional marriage', 'sanctity of life', 'american exceptionalism', 'patriotism'
  ];
  
  // Count bias indicators
  let leftCount = 0;
  let rightCount = 0;
  
  // Extract sentences that might contain bias
  const sentences = fullText.split(/[.!?]\s+/);
  const biasQuotes: string[] = [];
  
  for (const sentence of sentences) {
    let leftTermsInSentence = 0;
    let rightTermsInSentence = 0;
    
    // Check for left-leaning terms
    for (const term of leftBiasTerms) {
      if (sentence.toLowerCase().includes(term.toLowerCase())) {
        leftCount++;
        leftTermsInSentence++;
      }
    }
    
    // Check for right-leaning terms
    for (const term of rightBiasTerms) {
      if (sentence.toLowerCase().includes(term.toLowerCase())) {
        rightCount++;
        rightTermsInSentence++;
      }
    }
    
    // If sentence contains bias terms, add it to quotes
    if (leftTermsInSentence > 0 || rightTermsInSentence > 0) {
      // Only add if the sentence is of reasonable length and not already included
      if (sentence.length > 20 && sentence.length < 300 && !biasQuotes.includes(sentence)) {
        biasQuotes.push(sentence.trim() + '.');
      }
    }
  }
  
  // If we don't have enough bias quotes, add some general sentences from the article
  if (biasQuotes.length < 2 && sentences.length > 0) {
    // Find substantive sentences that might represent the article's perspective
    for (const sentence of sentences) {
      if (sentence.length > 40 && sentence.length < 250 && !biasQuotes.includes(sentence)) {
        // Look for sentences with opinion indicators or attributions
        if (sentence.toLowerCase().includes('according to') || 
            sentence.toLowerCase().includes('said') || 
            sentence.toLowerCase().includes('stated') || 
            sentence.toLowerCase().includes('believes') || 
            sentence.toLowerCase().includes('argues') || 
            sentence.toLowerCase().includes('claims') ||
            sentence.toLowerCase().includes('suggests') ||
            sentence.toLowerCase().includes('indicates')) {
          biasQuotes.push(sentence.trim() + '.');
          if (biasQuotes.length >= 3) break;
        }
      }
    }
  }
  
  // If we still don't have enough quotes, add some substantive sentences from the article
  if (biasQuotes.length < 2 && sentences.length > 0) {
    // Sort sentences by length (prefer longer, more substantive sentences)
    const sortedSentences = [...sentences].filter(s => s.length > 30 && s.length < 250)
      .sort((a, b) => b.length - a.length);
    
    // Take the top sentences that aren't already in biasQuotes
    for (const sentence of sortedSentences) {
      if (!biasQuotes.includes(sentence)) {
        biasQuotes.push(sentence.trim() + '.');
        if (biasQuotes.length >= 3) break;
      }
    }
  }
  
  // Determine overall bias based on term counts
  if (leftCount > rightCount * 1.5) {
    result.bias = 'left';
  } else if (rightCount > leftCount * 1.5) {
    result.bias = 'right';
  } else if (leftCount > 0 || rightCount > 0) {
    result.bias = 'center';
  } else {
    // If no clear bias terms, default to center
    result.bias = 'center';
  }
  
  // Limit to top 3 quotes
  result.biasQuotes = biasQuotes.slice(0, 3);
  
  return result;
}

// Helper function to determine news category
function determineNewsCategory(title: string, description: string, keywords: string[]): string {
  const text = (title + ' ' + description).toLowerCase();
  const allText = text + ' ' + keywords.join(' ').toLowerCase();
  
  // Check for US news
  if (/\b(us|united states|america|american|washington|biden|trump|congress|senate|house|white house)\b/.test(allText)) {
    return 'us';
  }
  
  // Check for politics
  if (/\b(politic|election|vote|democrat|republican|congress|senate|house|president|administration|government|law|supreme court|bill|legislation)\b/.test(allText)) {
    return 'politics';
  }
  
  // Check for world news
  if (/\b(world|global|international|europe|asia|africa|middle east|china|russia|ukraine|foreign|diplomatic|un|united nations)\b/.test(allText)) {
    return 'world';
  }
  
  // Check for business/economy
  if (/\b(business|economy|economic|market|stock|finance|trade|company|corporate|inflation|recession|fed|federal reserve)\b/.test(allText)) {
    return 'business';
  }
  
  // Check for technology
  if (/\b(tech|technology|digital|software|hardware|app|internet|cyber|ai|artificial intelligence|robot|innovation|startup)\b/.test(allText)) {
    return 'technology';
  }
  
  // Check for health
  if (/\b(health|medical|medicine|disease|virus|pandemic|doctor|hospital|patient|covid|vaccine|healthcare)\b/.test(allText)) {
    return 'health';
  }
  
  // Check for science
  if (/\b(science|scientific|research|study|discovery|space|nasa|physics|biology|chemistry|climate|environment)\b/.test(allText)) {
    return 'science';
  }
  
  // Check for sports
  if (/\b(sport|game|match|team|player|championship|tournament|olympic|football|soccer|basketball|baseball|tennis|nfl|nba|mlb)\b/.test(allText)) {
    return 'sports';
  }
  
  // Check for entertainment
  if (/\b(entertainment|movie|film|tv|television|show|celebrity|actor|actress|music|artist|concert|hollywood)\b/.test(allText)) {
    return 'entertainment';
  }
  
  // Check for social/lifestyle
  if (/\b(social|lifestyle|fashion|food|travel|celebrity|trend)\b/.test(allText)) {
    return 'social';
  }
  
  // Default to 'other' if no category matches
  return 'other';
}

// Helper function to check if two articles are about the same story
function areArticlesSimilar(article1: any, article2: any): boolean {
  // If titles are very similar, they're likely about the same story
  const titleSimilarity = calculateTitleSimilarity(article1.title, article2.title);
  if (titleSimilarity > 0.7) {
    return true;
  }
  
  // Check for shared entities
  const entities1 = extractNamedEntities(article1.title + ' ' + (article1.description || ''));
  const entities2 = extractNamedEntities(article2.title + ' ' + (article2.description || ''));
  
  // Count shared entities
  let sharedEntities = 0;
  for (const entity of entities1) {
    if (entities2.includes(entity)) {
      sharedEntities++;
    }
  }
  
  // If they share multiple entities, they're likely about the same story
  if (sharedEntities >= 2) {
    return true;
  }
  
  // Check for keyword overlap
  const keywords1 = article1.keywords || [];
  const keywords2 = article2.keywords || [];
  
  let sharedKeywords = 0;
  for (const keyword of keywords1) {
    if (keywords2.includes(keyword)) {
      sharedKeywords++;
    }
  }
  
  // If they share multiple keywords, they might be about the same story
  if (sharedKeywords >= 3) {
    return true;
  }
  
  return false;
}

// Helper function to calculate title similarity
function calculateTitleSimilarity(title1: string, title2: string): number {
  // Normalize titles
  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  };
  
  const normalizedTitle1 = normalize(title1);
  const normalizedTitle2 = normalize(title2);
  
  // Split into words
  const words1 = normalizedTitle1.split(' ');
  const words2 = normalizedTitle2.split(' ');
  
  // Count shared words
  let sharedWords = 0;
  for (const word of words1) {
    if (word.length > 3 && words2.includes(word)) {
      sharedWords++;
    }
  }
  
  // Calculate Jaccard similarity
  const uniqueWords = new Set([...words1, ...words2]);
  return sharedWords / uniqueWords.size;
}

// Helper function to extract named entities
function extractNamedEntities(text: string): string[] {
  // This is a simplified version that looks for capitalized words
  // In a real implementation, you'd use a NLP library
  
  const entities: string[] = [];
  const words = text.split(/\s+/);
  
  // Look for capitalized words that aren't at the start of sentences
  for (let i = 1; i < words.length; i++) {
    const word = words[i].replace(/[^\w]/g, ''); // Remove punctuation
    
    if (word.length > 1 && /^[A-Z]/.test(word)) {
      // Check if it's part of a multi-word entity
      let entity = word;
      let j = i + 1;
      
      // Continue adding capitalized words to the entity
      while (j < words.length) {
        const nextWord = words[j].replace(/[^\w]/g, '');
        if (nextWord.length > 1 && /^[A-Z]/.test(nextWord)) {
          entity += ' ' + nextWord;
          j++;
        } else {
          break;
        }
      }
      
      entities.push(entity);
      i = j - 1; // Skip the words we've already included
    }
  }
  
  // Also look for words at the start of sentences that might be entities
  if (words.length > 0) {
    const firstWord = words[0].replace(/[^\w]/g, '');
    if (firstWord.length > 1 && /^[A-Z]/.test(firstWord) && !/^(The|A|An|This|That|These|Those|It|He|She|They|We|I)$/i.test(firstWord)) {
      entities.push(firstWord);
    }
  }
  
  // Return unique entities
  return Array.from(new Set(entities));
}

// Function to generate fallback news articles when API is rate limited
function generateFallbackArticles(): any[] {
  const fallbackArticles = [
    {
      title: "Global Climate Summit Reaches Historic Agreement",
      description: "World leaders have agreed to ambitious new targets to reduce carbon emissions by 2030.",
      content: "In a landmark decision, representatives from 195 countries have committed to cutting carbon emissions by 50% before the end of the decade. The agreement, which follows two weeks of intense negotiations, has been hailed as a breakthrough in the fight against climate change. Environmental activists have welcomed the news but warn that implementation will be key.",
      source: { name: "Reuters" },
      sourceId: "reuters",
      url: "https://example.com/climate-summit",
      publishedAt: new Date().toISOString(),
      keywords: ["climate", "emissions", "agreement", "global", "summit", "carbon", "environment", "targets"],
      bias: "center",
      biasQuotes: [
        "The agreement represents a balanced approach to addressing climate challenges while considering economic realities.",
        "Both progressive and conservative leaders have expressed cautious optimism about the framework.",
        "The summit managed to bridge divides between developing and industrialized nations."
      ]
    },
    {
      title: "New Economic Policy Aims to Reduce Inflation",
      description: "The Federal Reserve announced a series of measures to tackle rising consumer prices.",
      content: "The Federal Reserve has unveiled a comprehensive strategy to combat inflation, which has reached its highest level in four decades. The plan includes a 0.5% interest rate hike, the largest single increase since 2000, and a reduction in the Fed's bond holdings. Economists are divided on whether these measures will be sufficient to curb inflation without triggering a recession.",
      source: { name: "Bloomberg" },
      sourceId: "bloomberg",
      url: "https://example.com/fed-inflation",
      publishedAt: new Date().toISOString(),
      keywords: ["economy", "inflation", "federal", "reserve", "interest", "rates", "policy", "recession"],
      bias: "center",
      biasQuotes: [
        "The Federal Reserve is walking a tightrope between controlling inflation and avoiding economic downturn.",
        "Analysts from across the political spectrum acknowledge the difficulty of the current economic situation.",
        "The policy represents a middle path between more aggressive and more cautious approaches."
      ]
    },
    {
      title: "Healthcare Reform Bill Passes Senate",
      description: "Landmark legislation expands coverage to millions of Americans.",
      content: "After months of debate, the Senate has passed a sweeping healthcare reform bill that would extend medical coverage to an estimated 15 million currently uninsured Americans. The legislation includes provisions for lowering prescription drug prices and expanding subsidies for low-income families. The bill now moves to the House, where it faces a more challenging path to approval.",
      source: { name: "Washington Post" },
      sourceId: "the-washington-post",
      url: "https://example.com/healthcare-bill",
      publishedAt: new Date().toISOString(),
      keywords: ["healthcare", "reform", "senate", "coverage", "legislation", "insurance", "medical", "bill"],
      bias: "left",
      biasQuotes: [
        "The historic bill represents a step toward universal healthcare that many progressive advocates have long championed.",
        "Supporters emphasize the moral imperative of ensuring all Americans have access to affordable healthcare.",
        "The legislation addresses systemic inequalities in the current healthcare system that disproportionately affect marginalized communities."
      ]
    },
    {
      title: "Tax Cut Package Proposed to Stimulate Economic Growth",
      description: "Republican lawmakers unveil plan to reduce corporate and individual tax rates.",
      content: "A group of Republican senators has introduced a comprehensive tax reform package that would significantly reduce rates for both corporations and individuals. Proponents argue the cuts will spur investment, create jobs, and boost economic growth. Critics contend the plan would primarily benefit wealthy Americans and increase the national deficit. The Congressional Budget Office is expected to release its analysis of the proposal next week.",
      source: { name: "Fox News" },
      sourceId: "fox-news",
      url: "https://example.com/tax-cuts",
      publishedAt: new Date().toISOString(),
      keywords: ["tax", "cuts", "economic", "growth", "republican", "deficit", "corporate", "reform"],
      bias: "right",
      biasQuotes: [
        "The tax cuts represent a commitment to free market principles and economic liberty.",
        "By allowing Americans to keep more of their hard-earned money, the plan respects traditional values of self-reliance and limited government.",
        "The proposal prioritizes job creation through business-friendly policies rather than government intervention."
      ]
    },
    {
      title: "Supreme Court Rules on Controversial Free Speech Case",
      description: "Justices deliver split decision on limits of First Amendment protections.",
      content: "In a closely watched case, the Supreme Court has issued a 5-4 ruling that establishes new guidelines for determining when speech crosses the line from protected expression to illegal incitement. The decision, which crossed ideological lines, attempts to balance free speech concerns with public safety considerations. Legal experts suggest the ruling will have far-reaching implications for social media companies and online content moderation.",
      source: { name: "CNN" },
      sourceId: "cnn",
      url: "https://example.com/supreme-court-speech",
      publishedAt: new Date().toISOString(),
      keywords: ["supreme", "court", "speech", "first", "amendment", "ruling", "justices", "constitutional"],
      bias: "center",
      biasQuotes: [
        "The Court's decision reflects a nuanced understanding of competing constitutional principles.",
        "Both civil liberties advocates and public safety experts found elements to praise in the ruling.",
        "The majority opinion carefully weighed precedent from both liberal and conservative judicial philosophies."
      ]
    },
    {
      title: "Immigration Reform Proposal Gains Bipartisan Support",
      description: "Compromise bill addresses border security and path to citizenship.",
      content: "A bipartisan group of senators has unveiled a comprehensive immigration reform package that includes enhanced border security measures alongside a pathway to citizenship for certain undocumented immigrants. The proposal has garnered initial support from moderate members of both parties, though it faces opposition from progressive Democrats who argue it is too restrictive and conservative Republicans who contend it amounts to amnesty.",
      source: { name: "ABC News" },
      sourceId: "abc-news",
      url: "https://example.com/immigration-reform",
      publishedAt: new Date().toISOString(),
      keywords: ["immigration", "reform", "bipartisan", "border", "security", "citizenship", "undocumented", "compromise"],
      bias: "center",
      biasQuotes: [
        "The bill represents a pragmatic middle ground between competing visions of immigration policy.",
        "Negotiators from both parties made significant concessions to reach this compromise.",
        "The proposal acknowledges both humanitarian concerns and the need for orderly legal immigration processes."
      ]
    }
  ];
  
  // Add some variation to the articles
  return fallbackArticles.map(article => {
    // Add random publishedAt times within the last week
    const randomDaysAgo = Math.floor(Math.random() * 7);
    const randomHours = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setDate(date.getDate() - randomDaysAgo);
    date.setHours(date.getHours() - randomHours);
    
    return {
      ...article,
      publishedAt: date.toISOString()
    };
  });
}
