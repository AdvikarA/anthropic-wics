declare module 'newsapi' {
  export default class NewsAPI {
    constructor(apiKey: string);
    
    v2: {
      topHeadlines(options: {
        category?: string;
        language?: string;
        country?: string;
        sources?: string;
        q?: string;
        pageSize?: number;
        page?: number;
      }): Promise<{
        status: string;
        totalResults: number;
        articles: Article[];
      }>;
      
      everything(options: {
        q?: string;
        qInTitle?: string;
        sources?: string;
        domains?: string;
        excludeDomains?: string;
        from?: string;
        to?: string;
        language?: string;
        sortBy?: string;
        pageSize?: number;
        page?: number;
      }): Promise<{
        status: string;
        totalResults: number;
        articles: Article[];
      }>;
      
      sources(options: {
        category?: string;
        language?: string;
        country?: string;
      }): Promise<{
        status: string;
        sources: Source[];
      }>;
    };
  }
  
  interface Source {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
    language: string;
    country: string;
  }
  
  interface Article {
    source: {
      id: string | null;
      name: string;
    };
    author: string | null;
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }
}
