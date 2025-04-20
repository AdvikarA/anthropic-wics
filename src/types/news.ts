export interface NewsSource {
  title: string;
  source: string;
  link: string;
}

export interface UniqueClaim {
  source: string;
  claims: string;
  bias?: 'left' | 'right' | 'center' | 'unknown';
}

export interface BiasQuote {
  quote: string;
}

export interface SourceBias {
  source: string;
  bias: 'left' | 'right' | 'center' | 'unknown';
  biasQuotes: string[];
}

export interface NewsStory {
  headline: string;
  summary: string;
  sources: NewsSource[];
  publishedAt?: string;
  fullContent?: string;
  category?: string;
  commonFacts?: string;
  uniqueClaims?: UniqueClaim[];
  sourceBias?: SourceBias[];
}
