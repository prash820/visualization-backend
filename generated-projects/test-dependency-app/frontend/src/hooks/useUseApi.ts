// useApi.ts

import { useState, useEffect, useCallback } from 'react';
import apiService from './apiService';
import { AxiosRequestConfig } from 'axios';

interface UseApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchData: (url: string, config?: AxiosRequestConfig) => Promise<void>;
}

function useApi<T>(): UseApiResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async (url: string, config?: AxiosRequestConfig) => {
    setLoading(true);
    setError(null);
    try {
      const responseData = await apiService.get<T>(url, config);
      setData(responseData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, error, loading, fetchData };
}

export default useApi;
