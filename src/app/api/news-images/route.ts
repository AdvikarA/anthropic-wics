import { NextResponse } from 'next/server';

/**
 * Validates if a URL is likely to be a valid image URL
 * Checks for common image extensions and patterns
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Check if URL ends with common image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const lowercaseUrl = url.toLowerCase();
  
  // Check for common image extensions
  const hasImageExtension = imageExtensions.some(ext => lowercaseUrl.endsWith(ext));
  
  // Check for common image hosting patterns
  const isImageHosting = [
    'images.', 'img.', 'photos.', 'static.', 'media.', 'cdn.', 
    '/images/', '/img/', '/photos/', '/media/', '/static/'
  ].some(pattern => lowercaseUrl.includes(pattern));
  
  // Also allow URLs with image-related query parameters
  const hasImageParams = ['image', 'photo', 'picture', 'thumbnail'].some(param => 
    lowercaseUrl.includes(param)
  );
  
  return hasImageExtension || isImageHosting || hasImageParams;
}

/**
 * Calculates a relevance score between a query and a title
 * Higher score means the title is more relevant to the query
 */
function calculateRelevanceScore(query: string, title: string): number {
  if (!query || !title) return 0;
  
  // Normalize both strings: lowercase and remove punctuation
  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[^\w\s]/g, '');
  };
  
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(title);
  
  // Split into words
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
  
  // Count matching words
  let matchCount = 0;
  for (const queryWord of queryWords) {
    if (titleWords.some(titleWord => titleWord.includes(queryWord) || queryWord.includes(titleWord))) {
      matchCount++;
    }
  }
  
  // Calculate score based on matching percentage and title length
  // Prefer titles that have more matches and are shorter (more focused)
  const matchPercentage = queryWords.length > 0 ? matchCount / queryWords.length : 0;
  const lengthFactor = 1 - Math.min(1, titleWords.length / 20); // Penalize very long titles
  
  // Final score is a weighted combination
  const score = (matchPercentage * 0.7) + (lengthFactor * 0.3);
  
  return score;
}

/**
 * Extracts key terms from a headline for better image search relevance
 * Removes common words, keeps important nouns and entities
 */
function extractKeyTerms(headline: string): string {
  // Convert to lowercase for processing
  const text = headline.toLowerCase();
  
  // Common words to filter out (stopwords)
  const stopwords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down',
    'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'says', 'said', 'amid', 'amid',
    'as', 'has', 'have', 'had', 'do', 'does', 'did', 'doing'
  ];
  
  // Split the headline into words
  const words = text.split(/\s+/);
  
  // Filter out stopwords and keep words longer than 3 characters
  const keyWords = words.filter(word => {
    // Remove punctuation
    const cleanWord = word.replace(/[^\w\s]/g, '');
    return cleanWord.length > 3 && !stopwords.includes(cleanWord);
  });
  
  // If we have too few keywords, use the original headline
  if (keyWords.length < 2) {
    return headline;
  }
  
  // Take the most important 5 words (or fewer if there aren't 5)
  const importantTerms = keyWords.slice(0, 5).join(' ');
  
  console.log(`Original headline: "${headline}"`); 
  console.log(`Extracted terms: "${importantTerms}"`); 
  
  return importantTerms;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  try {
    // Get API key from environment variables
    const newsApiKey = process.env.NEWS_API_KEY;
    
    // For debugging
    console.log('Fetching images for query:', query);
    console.log('NewsAPI key status:', newsApiKey ? 'Available' : 'Not available');
    
    if (!newsApiKey) {
      console.error('NEWS_API_KEY is not defined in environment variables');
      return NextResponse.json({ 
        error: 'API key not configured', 
        images: [] 
      }, { status: 500 });
    }
    
    // Prepare a more targeted search query
    // Extract key terms from the headline for better image matching
    const keyTerms = extractKeyTerms(query);
    console.log('Extracted key terms for image search:', keyTerms);
    
    // NewsAPI endpoint with enhanced query
    const newsApiUrl = 'https://newsapi.org/v2/everything';
    const searchUrl = `${newsApiUrl}?q=${encodeURIComponent(keyTerms)}&sortBy=relevancy&pageSize=10&language=en`;
    
    console.log('Making request to NewsAPI:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'X-Api-Key': newsApiKey,
      },
    });
    
    console.log('NewsAPI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('NewsAPI error response:', errorText);
      return NextResponse.json({ 
        error: `NewsAPI error: ${response.status} - ${errorText}`, 
        images: [] 
      }, { status: 500 });
    }
    
    const data = await response.json();
    console.log('NewsAPI response received, articles:', data.articles?.length || 0);
    
    // Extract and score image URLs from the response
    let images = data.articles
      ?.filter((article: any) => article.urlToImage && isValidImageUrl(article.urlToImage))
      .map((article: any) => {
        // Calculate relevance score based on title similarity to original query
        const relevanceScore = calculateRelevanceScore(query, article.title);
        
        return {
          url: article.urlToImage,
          source: article.source.name,
          title: article.title,
          relevanceScore
        };
      }) || [];
      
    // Sort images by relevance score (highest first)
    images = images.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
    
    console.log(`Found ${images.length} images, sorted by relevance`);
    if (images.length > 0) {
      console.log(`Top image (score ${images[0].relevanceScore}) from: ${images[0].source}`);
    }
    
    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Error fetching images from NewsAPI:', error);
    return NextResponse.json({ 
      error: error.message, 
      images: [] 
    }, { status: 500 });
  }
}
