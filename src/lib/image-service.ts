import axios from 'axios';

// Cache for image URLs to avoid repeated API calls for similar topics
const imageCache: Record<string, string> = {};

// Default fallback images by category
const defaultImages: Record<string, string> = {
  politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&auto=format&fit=crop',
  government: 'https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=800&auto=format&fit=crop',
  election: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&auto=format&fit=crop',
  court: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop',
  law: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop',
  economy: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
  business: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop',
  science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop',
  environment: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop',
  education: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop',
  immigration: 'https://images.unsplash.com/photo-1621506821957-1b50ab7a1d7f?w=800&auto=format&fit=crop',
  crime: 'https://images.unsplash.com/photo-1589578527966-fdac0f44566c?w=800&auto=format&fit=crop',
  war: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&auto=format&fit=crop',
  military: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800&auto=format&fit=crop',
  international: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop',
  entertainment: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&auto=format&fit=crop',
  default: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop'
};

/**
 * Get a relevant image URL for a news article based on keywords or title
 */
export async function getImageForArticle(title: string, keywords: string[] = []): Promise<string> {
  // Combine title and keywords for better search
  const searchTerms = [...keywords];
  
  // Extract key terms from title
  const titleWords = title.toLowerCase().split(' ');
  
  // Check if we have any category matches in the title or keywords
  for (const category of Object.keys(defaultImages)) {
    if (titleWords.includes(category) || keywords.includes(category)) {
      return defaultImages[category];
    }
  }
  
  // Try to find the most relevant category based on the title
  if (title.match(/president|congress|senate|house|government|administration|biden|trump|election|vote|ballot|democrat|republican|political/i)) {
    return defaultImages.politics;
  } else if (title.match(/court|justice|judge|supreme court|legal|law|lawsuit|attorney|lawyer/i)) {
    return defaultImages.court;
  } else if (title.match(/economy|economic|market|stock|inflation|fed|federal reserve|interest rate|unemployment/i)) {
    return defaultImages.economy;
  } else if (title.match(/tech|technology|digital|cyber|internet|ai|artificial intelligence|app|software|computer|robot/i)) {
    return defaultImages.technology;
  } else if (title.match(/health|covid|virus|disease|medical|doctor|hospital|patient|vaccine|medicine|healthcare/i)) {
    return defaultImages.health;
  } else if (title.match(/climate|environment|pollution|carbon|emission|sustainable|green|renewable|energy/i)) {
    return defaultImages.environment;
  } else if (title.match(/school|education|student|teacher|university|college|campus|learning/i)) {
    return defaultImages.education;
  } else if (title.match(/immigrant|immigration|border|migrant|refugee|asylum|deportation/i)) {
    return defaultImages.immigration;
  } else if (title.match(/war|military|army|navy|air force|troops|soldier|combat|weapon|defense|attack/i)) {
    return defaultImages.war;
  } else if (title.match(/international|global|world|foreign|diplomat|embassy|country|nation/i)) {
    return defaultImages.international;
  } else if (title.match(/crime|criminal|police|arrest|prison|jail|investigation|fbi|security/i)) {
    return defaultImages.crime;
  }
  
  // If no specific category match, use the default news image
  return defaultImages.default;
}
