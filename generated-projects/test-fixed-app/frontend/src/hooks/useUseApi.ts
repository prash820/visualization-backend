// useApi.ts

import { useState, useEffect, useCallback } from 'react';
import apiService from './apiService';
import { AppContext } from './types';

interface UseApiResult {
  appData: AppContext | null;
  loading: boolean;
  error: string | null;
  refreshAppData: () => Promise<void>;
  updateAppData: (newData: Partial<AppContext>) => Promise<void>;
}

export function useApi(): UseApiResult {
  const [appData, setAppData] = useState<AppContext | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getAppData();
      setAppData(data);
    } catch (err) {
      setError('Failed to fetch app data');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAppData = useCallback(async (newData: Partial<AppContext>) => {
    setLoading(true);
    setError(null);
    try {
      const updatedData = await apiService.updateAppData(newData);
      setAppData(updatedData);
    } catch (err) {
      setError('Failed to update app data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  return {
    appData,
    loading,
    error,
    refreshAppData: fetchAppData,
    updateAppData
  };
}
