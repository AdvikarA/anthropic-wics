"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function TestPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to get cached news
      let response = await axios.get('/api/news', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      setData(response.data);
      
      // If no cached news, try to refresh
      if (!response.data.newsEvents?.length && !response.data.newsStories?.length) {
        response = await axios.get('/api/news?refresh=true', {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        setData(response.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">News API Test</h1>
      
      <button 
        onClick={fetchData}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        Refresh Data
      </button>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">Response Data:</h2>
          
          {data?.newsEvents && (
            <div className="mb-4">
              <h3 className="text-lg font-medium">News Events: {data.newsEvents.length}</h3>
              {data.newsEvents.length > 0 && (
                <div className="border p-4 mb-4">
                  <h4 className="font-bold">First Event:</h4>
                  <p><strong>Headline:</strong> {data.newsEvents[0].factualHeadline}</p>
                  <p><strong>Articles:</strong> {data.newsEvents[0].articles?.length || 0}</p>
                  
                  {data.newsEvents[0].articles?.map((article: any, i: number) => (
                    <div key={i} className="border-t mt-2 pt-2">
                      <p><strong>Article {i+1}:</strong> {article.title}</p>
                      <p><strong>Source:</strong> {article.source?.name}</p>
                      <p><strong>Has Image:</strong> {article.urlToImage ? 'Yes' : 'No'}</p>
                      {article.urlToImage && (
                        <div>
                          <p><strong>Image URL:</strong> {article.urlToImage}</p>
                          <img 
                            src={article.urlToImage} 
                            alt={article.title}
                            className="mt-2 max-w-md h-auto"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {data?.newsStories && (
            <div>
              <h3 className="text-lg font-medium">News Stories: {data.newsStories.length}</h3>
              {data.newsStories.length > 0 && (
                <div className="border p-4">
                  <h4 className="font-bold">First Story:</h4>
                  <p><strong>Headline:</strong> {data.newsStories[0].headline}</p>
                  <p><strong>Sources:</strong> {data.newsStories[0].sources?.length || 0}</p>
                  
                  {data.newsStories[0].sources?.map((source: any, i: number) => (
                    <div key={i} className="border-t mt-2 pt-2">
                      <p><strong>Source {i+1}:</strong> {source.title}</p>
                      <p><strong>Name:</strong> {source.source}</p>
                      <p><strong>Has Image:</strong> {source.imageUrl ? 'Yes' : 'No'}</p>
                      {source.imageUrl && (
                        <div>
                          <p><strong>Image URL:</strong> {source.imageUrl}</p>
                          <img 
                            src={source.imageUrl} 
                            alt={source.title}
                            className="mt-2 max-w-md h-auto"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2">Raw Response:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
