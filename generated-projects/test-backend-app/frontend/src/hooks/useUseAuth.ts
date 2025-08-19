// useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { User, AppError } from './types';
import { ApiService } from './apiService';
import { handleAppError, createAppError } from './utils';
import { ERROR_CODES } from './constants';

interface UseAuthReturn {
  user: User | null;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  error: AppError | null;
}

export const useAuth = (users: User[]): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const apiService = new ApiService(users, [], []);

  const handleError = useCallback((error: AppError) => {
    setError(error);
    handleAppError(error);
  }, []);

  const login = useCallback(async (userId: string): Promise<void> => {
    try {
      const foundUser = apiService.getUserById(userId);
      if (!foundUser) {
        throw createAppError('User not found', ERROR_CODES.NOT_FOUND);
      }
      setUser(foundUser);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    // Optionally, implement logic to check for an existing session on mount
  }, []);

  return {
    user,
    login,
    logout,
    error
  };
};
