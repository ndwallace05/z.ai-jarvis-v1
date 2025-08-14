'use client';

import { useState, useEffect } from 'react';

interface SearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

interface WebSearch {
  id: string;
  query: string;
  results: SearchResult[];
  summary?: string;
  urls: string[];
  createdAt: string;
}

interface UseSearchReturn {
  searches: WebSearch[];
  loading: boolean;
  error: string | null;
  performSearch: (query: string) => Promise<SearchResult[]>;
  deleteSearch: (id: string) => Promise<void>;
  refreshSearches: () => Promise<void>;
}

export function useSearch(userId: string): UseSearchReturn {
  const [searches, setSearches] = useState<WebSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSearches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/search/history?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search history');
      }
      
      const data = await response.json();
      const processedSearches = (data.searches || []).map((search: any) => ({
        ...search,
        results: JSON.parse(search.results),
        urls: JSON.parse(search.urls),
      }));
      setSearches(processedSearches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async (query: string): Promise<SearchResult[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          query,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform search');
      }

      const data = await response.json();
      
      // Refresh searches to include the new one
      await fetchSearches();
      
      return data.results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSearch = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/search/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete search');
      }

      setSearches(prev => prev.filter(search => search.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchSearches();
    }
  }, [userId]);

  return {
    searches,
    loading,
    error,
    performSearch,
    deleteSearch,
    refreshSearches: fetchSearches,
  };
}