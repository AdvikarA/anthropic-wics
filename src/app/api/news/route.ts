import { NextResponse } from "next/server";
import axios from 'axios';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

interface NewsItem {
  headline: string;
  date: string;
  summary: string;
  sources: string[];
}

// Add delay to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  if (!BRAVE_API_KEY) {
    return NextResponse.json({ error: 'Brave API key not configured' }, { status: 500 });
  }

  try {
    console.log('Fetching news from Brave API...');
    
    const response = await axios.get(BRAVE_SEARCH_URL, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      params: {
        q: 'breaking news today',
        count: 10
      }
    });

    if (!response.data || !response.data.web || !response.data.web.results) {
      throw new Error('Invalid response format from Brave API');
    }

    const newsItems = response.data.web.results.map((result: any) => ({
      headline: result.title,
      summary: result.description,
      date: new Date().toLocaleDateString(),
      sources: [result.url],
      source: new URL(result.url).hostname.replace('www.', '')
    }));

    if (!newsItems || newsItems.length === 0) {
      return NextResponse.json({ error: 'No news items found' }, { status: 404 });
    }

    return NextResponse.json({ newsItems }, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    const status = axios.isAxiosError(error) && error.response ? error.response.status : 500;
    const message = error instanceof Error ? error.message : 'Failed to fetch news';
    return NextResponse.json({ error: message }, { status });
  }
}
