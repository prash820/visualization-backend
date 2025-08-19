// useApi.ts

import { useState, useEffect, useCallback } from 'react';
import { ArithmeticOperation, OperationResult, CalculationHistoryEntry } from './types';
import { performCalculation, fetchCalculationHistory, clearCalculationHistory } from './apiService';
import { handleError } from './utils';

interface UseApiResult {
  calculate: (operation: ArithmeticOperation) => Promise<OperationResult>;
  history: CalculationHistoryEntry[];
  loading: boolean;
  error: string | null;
  clearHistory: () => Promise<void>;
}

export function useApi(): UseApiResult {
  const [history, setHistory] = useState<CalculationHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedHistory = await fetchCalculationHistory();
      setHistory(fetchedHistory);
    } catch (error) {
      handleError(error);
      setError('Failed to load calculation history');
    } finally {
      setLoading(false);
    }
  }, []);

  const calculate = useCallback(async (operation: ArithmeticOperation): Promise<OperationResult> => {
    setLoading(true);
    try {
      const result = await performCalculation(operation);
      setHistory((prevHistory) => [...prevHistory, { operation, result }]);
      return result;
    } catch (error) {
      handleError(error);
      setError('Failed to perform calculation');
      return 'Error';
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    setLoading(true);
    try {
      const success = await clearCalculationHistory();
      if (success) {
        setHistory([]);
      }
    } catch (error) {
      handleError(error);
      setError('Failed to clear calculation history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    calculate,
    history,
    loading,
    error,
    clearHistory,
  };
}
