import { useState, useEffect } from 'react';

export const useApi = (endpoint: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [endpoint]);

  return { data, loading, error, refetch };
};

export default useApi;