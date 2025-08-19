import { useState, useEffect } from 'react';

export const useApi = (endpoint: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, [endpoint]);

  return { data, loading };
};