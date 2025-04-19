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

interface NewsSource {
  title: string;
  source: string;
  link: string;
}

interface NewsStory {
  headline: string;
  summary: string;
  sources: NewsSource[];
  publishedAt?: string;
  fullContent?: string;
  mainKeywords?: string[];
}

export async function GET() {
  try {
    console.log('Fetching news from NewsAPI...');
    console.log('Using NewsAPI key:', NEWS_API_KEY ? 'Key is set' : 'Key is NOT set');

    // First, collect all articles from different sources
    const allArticles: any[] = [];
    
    // Fetch from multiple sources to get diverse perspectives
    const topSources = [
      'bbc-news',
      'cnn',
      'fox-news',
      'the-washington-post',
      'reuters',
      'associated-press',
      'bloomberg',
      'politico',
      'the-wall-street-journal',
      'nbc-news',
      'abc-news'
    ];
    
    // Fetch top headlines from each source
    for (const source of topSources) {
      try {
        console.log(`Fetching headlines from ${source}...`);
        const sourceUrl = `${NEWS_API_BASE_URL}/top-headlines?sources=${source}&pageSize=10&apiKey=${NEWS_API_KEY}`;
        
        const response = await axios.get(sourceUrl);
        const data = response.data;
        
        if (data.articles && data.articles.length > 0) {
          console.log(`Got ${data.articles.length} articles from ${source}`);
          
          // Add source info to each article
          data.articles.forEach((article: any) => {
            if (article.title && article.url) {
              // Extract keywords from title and description
              const keywords = extractKeywords(article.title + ' ' + (article.description || ''));
              
              allArticles.push({
                ...article,
                sourceId: source,
                keywords: keywords
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error);
      }
    }
    
    console.log(`Collected ${allArticles.length} total articles from all sources`);
    
    // Group similar articles together based on keywords and title similarity
    const storyGroups: any[][] = [];
    
    // Process each article
    for (const article of allArticles) {
      // Check if this article belongs to an existing group
      let foundGroup = false;
      
      for (const group of storyGroups) {
        // Check if this article is similar to the first article in the group
        if (areArticlesSimilar(article, group[0])) {
          group.push(article);
          foundGroup = true;
          break;
        }
      }
      
      // If no matching group, create a new one
      if (!foundGroup) {
        storyGroups.push([article]);
      }
    }
    
    console.log(`Grouped articles into ${storyGroups.length} story groups`);
    
    // Convert groups to NewsStory objects
    const newsStories: NewsStory[] = [];
    
    for (const group of storyGroups) {
      // Skip groups with only one source (we want multiple perspectives)
      if (group.length < 2) {
        console.log('Skipping group with only one source');
        continue;
      }
      
      // Use the first article as the main one
      const mainArticle = group[0];
      
      // Create sources array from all articles in the group
      const sources: NewsSource[] = group.map(article => ({
        title: article.title,
        source: article.source?.name || new URL(article.url).hostname.replace('www.', ''),
        link: article.url
      }));
      
      // Generate a comprehensive summary using all articles in the group
      let combinedDescription = group
        .map(article => article.description || article.title)
        .join('\n\n');
      
      // Limit combined description length
      if (combinedDescription.length > 1000) {
        combinedDescription = combinedDescription.substring(0, 1000);
      }
      
      // Generate AI summary with Claude
      let summary = mainArticle.description || mainArticle.title;
      try {
        console.log('Generating AI summary for story group');
        const completion = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `This is a news story covered by multiple sources. Create a comprehensive, neutral summary in 3-4 sentences that captures the key facts and different perspectives:\n\n${combinedDescription}`
          }],
        });
        
        if (typeof completion.content === 'string') {
          summary = completion.content;
        } else if (Array.isArray(completion.content) && completion.content.length > 0) {
          if (typeof completion.content[0] === 'object' && 'text' in completion.content[0]) {
            summary = completion.content[0].text;
          }
        }
        console.log('Generated summary:', summary.substring(0, 50) + '...');
      } catch (summaryError) {
        console.error('Error generating summary:', summaryError);
      }
      
      // Add to news stories
      newsStories.push({
        headline: mainArticle.title,
        summary: summary,
        sources: sources,
        publishedAt: mainArticle.publishedAt,
        mainKeywords: mainArticle.keywords
      });
      
      // Limit to 10 story groups
      if (newsStories.length >= 10) break;
    }
    
    // If we don't have enough multi-source stories, add some single-source stories
    if (newsStories.length < 5) {
      console.log('Adding single-source stories to reach minimum count');
      
      for (const group of storyGroups) {
        if (group.length === 1 && newsStories.length < 10) {
          const article = group[0];
          
          // Generate AI summary
          let summary = article.description || article.title;
          try {
            if (article.description && article.description.length > 20) {
              console.log('Generating AI summary for single-source story');
              const completion = await anthropic.messages.create({
                model: "claude-3-haiku-20240307",
                max_tokens: 250,
                messages: [{
                  role: "user",
                  content: `Summarize this news article in 2-3 concise sentences, focusing on the key facts and implications:\n\n${article.description}`
                }],
              });
              
              if (typeof completion.content === 'string') {
                summary = completion.content;
              } else if (Array.isArray(completion.content) && completion.content.length > 0) {
                if (typeof completion.content[0] === 'object' && 'text' in completion.content[0]) {
                  summary = completion.content[0].text;
                }
              }
            }
          } catch (summaryError) {
            console.error('Error generating summary:', summaryError);
          }
          
          // Add to news stories
          newsStories.push({
            headline: article.title,
            summary: summary,
            sources: [{
              title: article.title,
              source: article.source?.name || new URL(article.url).hostname.replace('www.', ''),
              link: article.url
            }],
            publishedAt: article.publishedAt,
            mainKeywords: article.keywords
          });
        }
      }
    }

    // Return the news stories
    if (newsStories.length === 0) {
      return NextResponse.json({ error: 'No news stories found' }, { status: 404 });
    }

    return NextResponse.json({ newsStories }, { status: 200 });
  } catch (error) {
    console.error('NewsAPI error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper function to calculate title similarity (returns a score from 0 to 1)
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  // Normalize titles
  const normalize = (text: string) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|with|by|of)\b/g, '') // Remove common words
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };
  
  const a = normalize(title1);
  const b = normalize(title2);
  
  // Exact match after normalization
  if (a === b) return 1.0;
  
  // One is a substring of the other (strong indicator)
  if (a.includes(b) || b.includes(a)) {
    // Calculate what percentage of the longer string is covered
    const coverage = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.8 * coverage; // Scale based on coverage but cap at 0.8
  }
  
  // Count matching significant words (longer than 3 chars)
  const wordsA = a.split(/\s+/).filter(w => w.length > 3);
  const wordsB = b.split(/\s+/).filter(w => w.length > 3);
  
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  
  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.includes(word)) {
      matches++;
    }
  }
  
  // Calculate Jaccard similarity coefficient
  const uniqueWordsA = new Set<string>(wordsA);
  const uniqueWordsB = new Set<string>(wordsB);
  const intersection = new Set<string>(wordsA.filter(x => uniqueWordsB.has(x)));
  const union = new Set<string>([...wordsA, ...wordsB]);
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Calculate word match ratio
  const wordMatchRatio = matches / Math.max(wordsA.length, wordsB.length);
  
  // Return weighted average of both metrics
  return (jaccardSimilarity * 0.6) + (wordMatchRatio * 0.4);
}

// Helper function to check if two articles are about the same story
function areArticlesSimilar(article1: any, article2: any): boolean {
  // Skip comparison if from same source - we want different sources
  if (article1.sourceId === article2.sourceId) {
    return false;
  }
  
  // Calculate title similarity score (0-1)
  const titleSimilarityScore = calculateTitleSimilarity(article1.title, article2.title);
  
  // Very high title similarity is a strong indicator
  if (titleSimilarityScore > 0.8) {
    console.log(`High title similarity (${titleSimilarityScore.toFixed(2)}) between:\n"${article1.title}"\nand\n"${article2.title}"`);
    return true;
  }
  
  // Extract named entities (people, places, organizations)
  const entities1 = extractNamedEntities(article1.title + ' ' + (article1.description || ''));
  const entities2 = extractNamedEntities(article2.title + ' ' + (article2.description || ''));
  
  // Check for matching named entities
  const matchingEntities = entities1.filter(entity => entities2.includes(entity));
  
  // If we have multiple matching named entities and decent title similarity
  if (matchingEntities.length >= 2 && titleSimilarityScore > 0.4) {
    console.log(`Found ${matchingEntities.length} matching entities with title similarity ${titleSimilarityScore.toFixed(2)}:\n"${article1.title}"\nand\n"${article2.title}"`);
    console.log('Matching entities:', matchingEntities.join(', '));
    return true;
  }
  
  // Check for significant keyword overlap
  if (article1.keywords && article2.keywords) {
    const overlap = article1.keywords.filter((kw: string) => article2.keywords.includes(kw));
    
    // Strong keyword match with some title similarity
    if (overlap.length >= 3 && titleSimilarityScore > 0.3) {
      console.log(`Found ${overlap.length} matching keywords with title similarity ${titleSimilarityScore.toFixed(2)}:\n"${article1.title}"\nand\n"${article2.title}"`);
      console.log('Matching keywords:', overlap.join(', '));
      return true;
    }
  }
  
  // Time proximity check - only consider very recent articles (within 12 hours)
  if (article1.publishedAt && article2.publishedAt) {
    const date1 = new Date(article1.publishedAt);
    const date2 = new Date(article2.publishedAt);
    const hoursDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
    
    // For very recent articles with some similarity and matching entities
    if (hoursDiff < 12 && titleSimilarityScore > 0.35 && matchingEntities.length >= 1) {
      console.log(`Articles published within ${hoursDiff.toFixed(1)} hours with matching entity and title similarity ${titleSimilarityScore.toFixed(2)}`);
      return true;
    }
  }
  
  return false;
}

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // List of common stop words to exclude
  const stopWords = new Set([
    'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 
    'did', 'but', 'or', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'about', 'who',
    'this', 'that', 'these', 'those', 'there', 'here', 'what', 'which', 'how', 'why', 'where',
    'when', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
    'now', 'from', 'get', 'got', 'getting', 'says', 'said', 'amid', 'among', 'could', 'would',
    'may', 'might', 'must', 'need', 'ought', 'shall', 'should', 'will', 'would', 'news', 'today',
    'latest', 'breaking', 'update', 'report', 'according', 'says', 'said', 'tell', 'told', 'claim',
    'claims', 'report', 'reports', 'reveal', 'reveals', 'confirm', 'confirms', 'suggest', 'suggests'
  ]);
  
  // Normalize text
  const normalized = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');   // Normalize whitespace
  
  // Split into words and filter
  const words = normalized.split(' ')
    .filter(word => 
      word.length > 3 &&          // Only words longer than 3 chars
      !stopWords.has(word) &&     // Not a stop word
      !(/^\d+$/.test(word))      // Not just a number
    );
  
  // Count word frequencies
  const wordCounts: {[key: string]: number} = {};
  for (const word of words) {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  // Get unique words sorted by frequency
  const uniqueWords = Object.keys(wordCounts)
    .sort((a, b) => wordCounts[b] - wordCounts[a]);
  
  // Return top keywords (up to 10)
  return uniqueWords.slice(0, 10);
}

// Helper function to extract named entities (people, places, organizations)
function extractNamedEntities(text: string): string[] {
  if (!text) return [];
  
  // This is a simplified approach to named entity recognition
  // In a production system, you would use a proper NLP library
  
  // Normalize text but preserve case for proper nouns
  const normalized = text
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
  
  // Extract capitalized phrases (potential named entities)
  const words = normalized.split(' ');
  const entities: string[] = [];
  let currentEntity = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if word starts with capital letter (potential named entity)
    if (word.length > 0 && word[0] === word[0].toUpperCase() && /[A-Z]/.test(word[0])) {
      // Skip common sentence starters if they're the first word
      if (i === 0 && ['The', 'A', 'An', 'This', 'That', 'These', 'Those', 'It', 'There'].includes(word)) {
        continue;
      }
      
      // Skip common non-entity capitalized words
      if (['I', 'Im', "I'm", 'Ill', "I'll", 'Ive', "I've", 'Id', "I'd"].includes(word)) {
        continue;
      }
      
      // Add to current entity
      if (currentEntity) {
        currentEntity += ' ' + word;
      } else {
        currentEntity = word;
      }
    } else {
      // End of entity
      if (currentEntity) {
        // Only add if it's not just a single word (more likely to be a real entity)
        if (currentEntity.includes(' ') || currentEntity.length > 7) {
          entities.push(currentEntity.toLowerCase());
        }
        currentEntity = '';
      }
    }
  }
  
  // Add final entity if there is one
  if (currentEntity && (currentEntity.includes(' ') || currentEntity.length > 7)) {
    entities.push(currentEntity.toLowerCase());
  }
  
  // Remove duplicates and return
  return Array.from(new Set<string>(entities));
}

// Helper function to fetch article content
async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Extract article content from HTML
    const html = response.data;
    
    // Simple extraction of main content
    let content = '';
    
    // Extract text from paragraph tags
    const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = paragraphRegex.exec(html)) !== null) {
      // Remove HTML tags from the paragraph content
      const text = match[1].replace(/<[^>]*>/g, '');
      if (text.length > 30) { // Only include substantial paragraphs
        content += text + '\n\n';
      }
    }
    
    // Limit content length
    if (content.length > 1500) {
      content = content.substring(0, 1500) + '...';
    }
    
    return content || null;
  } catch (error) {
    console.error('Error fetching article content:', error);
    return null;
  }
}

// Helper function to extract keywords from a title
function getKeywords(title: string, count: number = 3): string {
  if (!title) return '';
  
  // Remove common stop words
  const stopWords = ['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'is', 'are', 'was', 'were'];
  
  // Normalize and split
  const words = title.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word));
  
  // Return top keywords
  return words.slice(0, count).join(' ');
}

// Helper function to get other news sources
function getOtherSources(currentSourceId: string | null): string {
  const topSources = [
    'bbc-news',
    'cnn',
    'the-washington-post',
    'the-new-york-times',
    'reuters',
    'associated-press',
    'bloomberg',
    'the-wall-street-journal',
    'the-guardian-uk',
    'usa-today'
  ];
  
  // Filter out current source
  return topSources
    .filter(id => id !== currentSourceId)
    .slice(0, 5)
    .join(',');
}
