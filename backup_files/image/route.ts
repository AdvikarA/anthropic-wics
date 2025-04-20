import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';

// Default fallback images in case the API fails
const fallbackImages: Record<string, string> = {
  default: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop', // Newspaper
  politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=600&fit=crop', // White House
  court: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop', // Gavel
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop', // Campus
  crime: 'https://images.unsplash.com/photo-1453873623425-04e3561289aa?w=800&h=600&fit=crop' // Police lights
};

export async function GET(request: NextRequest) {
  // 1) Get the query parameter
  const query = request.nextUrl.searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json(
      { error: 'Missing query parameter' },
      { status: 400 }
    );
  }

  try {
    // 3) Generate a search query based on the headline
    const searchQuery = generateSearchQuery(query);
    console.log(`Searching Brave for images related to: "${searchQuery}"`);
    
    // 4) Call Brave Search API to get relevant images
    const braveApiKey = process.env.BRAVE_API_KEY;
    if (!braveApiKey) {
      throw new Error('BRAVE_API_KEY is not set in environment variables');
    }
    
    try {
      const response = await axios.get('https://api.search.brave.com/res/v1/images/search', {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': braveApiKey
        },
        params: {
          q: searchQuery,
          count: 10, // Request 10 images to have options
          safesearch: 'strict'
        },
        // Add a timeout to prevent hanging requests
        timeout: 5000
      });
      
      // 5) Extract image URLs from the response
      if (response.data && response.data.results && response.data.results.length > 0) {
        // Find the best image (prioritize news sources and higher resolution)
        const images = response.data.results;
        
        // Sort by image quality and relevance
        const sortedImages = images.sort((a: any, b: any) => {
          // Prioritize news sources
          const aIsNews = a.source_domain && (
            a.source_domain.includes('news') || 
            a.source_domain.includes('cnn') || 
            a.source_domain.includes('bbc') || 
            a.source_domain.includes('reuters') ||
            a.source_domain.includes('ap') ||
            a.source_domain.includes('guardian') ||
            a.source_domain.includes('nytimes') ||
            a.source_domain.includes('washingtonpost')
          );
          
          const bIsNews = b.source_domain && (
            b.source_domain.includes('news') || 
            b.source_domain.includes('cnn') || 
            b.source_domain.includes('bbc') || 
            b.source_domain.includes('reuters') ||
            b.source_domain.includes('ap') ||
            b.source_domain.includes('guardian') ||
            b.source_domain.includes('nytimes') ||
            b.source_domain.includes('washingtonpost')
          );
          
          if (aIsNews && !bIsNews) return -1;
          if (!aIsNews && bIsNews) return 1;
          
          // Then prioritize by resolution
          const aResolution = (a.properties?.width || 0) * (a.properties?.height || 0);
          const bResolution = (b.properties?.width || 0) * (b.properties?.height || 0);
          
          return bResolution - aResolution;
        });
        
        // Get the best image
        const bestImage = sortedImages[0];
        const imageUrl = bestImage.thumbnail?.src || bestImage.properties?.url;
        
        if (imageUrl) {
          console.log(`Found image for "${query}": ${imageUrl}`);
          return NextResponse.json({ imageUrl });
        }
      }
      
      // If no images found or processing failed, fall back to a default image
      throw new Error('No suitable images found in Brave search results');
    } catch (apiError: any) {
      // Handle rate limiting specifically
      if (apiError.response && apiError.response.status === 429) {
        console.error('Brave API rate limit exceeded. Using alternative image source.');
        throw new Error('Rate limit exceeded');
      }
      
      // Handle other API errors
      throw apiError;
    }
  } catch (error) {
    console.error('Error fetching image from Brave:', error);
    
    // 6) Use a direct Unsplash URL as fallback if Brave fails
    try {
      // Generate a direct Unsplash URL based on the query
      const searchTerm = query.replace(/\s+/g, ',').toLowerCase();
      const fallbackUnsplashUrl = `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(searchTerm)}&t=${Date.now()}`;
      
      console.log(`Using Unsplash fallback for "${query}": ${fallbackUnsplashUrl}`);
      return NextResponse.json({ imageUrl: fallbackUnsplashUrl });
    } catch (fallbackError) {
      console.error('Fallback image source also failed:', fallbackError);
    }
    
    // 7) Use a default fallback image as last resort
    const category = determineCategory(query.toLowerCase());
    const fallbackUrl = fallbackImages[category] || fallbackImages.default;
    console.log(`Using default fallback image for "${query}": ${fallbackUrl}`);
    return NextResponse.json({ imageUrl: fallbackUrl });
  }
}

// Generate a search query for the Brave API based on the headline
function generateSearchQuery(headline: string): string {
  // Extract key entities from the headline
  const entities = extractKeyEntities(headline);
  
  // Special case handling for specific news topics
  const lower = headline.toLowerCase();
  
  if (lower.includes('florida state') && lower.includes('shooting')) {
    return 'Florida State University shooting news';
  } else if (lower.includes('van hollen') && (lower.includes('el salvador') || lower.includes('deported'))) {
    return 'Senator Van Hollen El Salvador deportation news';
  } else if (lower.includes('aclu') && lower.includes('supreme court') && lower.includes('venezuelan')) {
    return 'ACLU Supreme Court Venezuelan deportation news';
  } else if (lower.includes('alien enemies act')) {
    return 'Alien Enemies Act deportation news';
  }
  
  // For other headlines, create a search query with the most important words
  // and add 'news' to prioritize news images
  return headline.trim() + ' news';
}

// Extract key entities from a headline
function extractKeyEntities(headline: string): string[] {
  const entities: string[] = [];
  
  // Look for proper nouns (usually capitalized in headlines)
  const words = headline.split(' ');
  let currentEntity = '';
  
  for (const word of words) {
    // Skip common words
    if (['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of'].includes(word.toLowerCase())) {
      continue;
    }
    
    // Add important entities
    if (word.length > 3) {
      entities.push(word);
    }
  }
  
  return entities;
}

// Determine category based on keywords
function determineCategory(text: string): string {
  // Define specific keyword matches for categorization
  const categoryMatches = [
    { category: 'shooting', keywords: ['shooting', 'gunman', 'gun violence', 'shot dead', 'killed in shooting'] },
    { category: 'supremecourt', keywords: ['supreme court', 'scotus', 'chief justice', 'justice roberts'] },
    { category: 'senators', keywords: ['senator', 'van hollen', 'senate hearing', 'senate committee'] },
    { category: 'deportation', keywords: ['deport', 'deportation', 'ice custody', 'wrongly deported'] },
    { category: 'university', keywords: ['university', 'florida state', 'campus', 'college campus', 'student union'] },
    { category: 'politics', keywords: ['politic', 'president', 'congress', 'government', 'election', 'white house', 'capitol'] },
    { category: 'court', keywords: ['court', 'justice', 'law', 'legal', 'aclu', 'judge', 'lawsuit', 'ruling'] },
    { category: 'immigration', keywords: ['immigra', 'border', 'migrant', 'asylum', 'alien', 'venezuelan'] },
    { category: 'economy', keywords: ['econom', 'financ', 'market', 'business', 'trade', 'inflation', 'recession'] },
    { category: 'technology', keywords: ['tech', 'digital', 'computer', 'software', 'ai', 'algorithm', 'silicon valley'] },
    { category: 'health', keywords: ['health', 'medic', 'hospital', 'doctor', 'patient', 'disease', 'treatment', 'vaccine'] },
    { category: 'education', keywords: ['school', 'educat', 'college', 'student', 'teacher', 'classroom', 'academic'] },
    { category: 'war', keywords: ['war', 'military', 'army', 'conflict', 'troops', 'soldier', 'combat', 'battlefield'] },
    { category: 'crime', keywords: ['crime', 'police', 'arrest', 'prison', 'criminal', 'investigation', 'detective'] },
    { category: 'environment', keywords: ['environment', 'climate', 'nature', 'pollution', 'carbon', 'emission', 'renewable'] }
  ];
  
  // Find the first category that matches any of its keywords
  for (const match of categoryMatches) {
    if (match.keywords.some(keyword => text.includes(keyword))) {
      return match.category;
    }
  }
  
  return 'default';
}
