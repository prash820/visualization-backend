import { useState } from 'react';
import apiClient from '../services/api';

export const useApi = (endpoint, options) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiClient(endpoint, options);
      return response.data;
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { fetchData, loading, error };
};