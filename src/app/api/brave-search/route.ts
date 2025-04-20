import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }
  
  try {
    // Get API key from environment variables
    const braveApiKey = process.env.BRAVE_API_KEY;
    
    // For debugging
    console.log('Fetching images for query:', query);
    console.log('Brave API key status:', braveApiKey ? 'Available' : 'Not available');
    
    if (!braveApiKey) {
      console.error('BRAVE_API_KEY is not defined in environment variables');
      return NextResponse.json({ 
        error: 'API key not configured', 
        images: [] 
      }, { status: 500 });
    }
    
    // Brave Search API endpoint
    const braveApiUrl = 'https://api.search.brave.com/res/v1/images/search';
    const searchUrl = `${braveApiUrl}?q=${encodeURIComponent(query)}&count=5`;
    
    console.log('Making request to Brave API:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveApiKey,
      },
    });
    
    console.log('Brave API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brave API error response:', errorText);
      return NextResponse.json({ 
        error: `Brave API error: ${response.status} - ${errorText}`, 
        images: [] 
      }, { status: 500 });
    }
    
    const data = await response.json();
    console.log('Brave API response received, results:', data.results?.length || 0);
    
    // Extract image URLs from the response
    const images = data.results?.map((result: any) => ({
      url: result.thumbnail.url,
      source: result.source,
      title: result.title,
    })) || [];
    
    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('Error fetching images from Brave:', error);
    return NextResponse.json({ 
      error: error.message, 
      images: [] 
    }, { status: 500 });
  }
}
