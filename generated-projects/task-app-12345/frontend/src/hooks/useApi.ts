import { useState, useEffect } from 'react';
import axios from 'axios';

export const useApi = (endpoint: string) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(endpoint)
      .then(response => setData(response.data))
      .catch(error => setError(error));
  }, [endpoint]);

  return { data, error };
};