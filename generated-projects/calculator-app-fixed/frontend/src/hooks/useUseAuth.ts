// useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { login, logout, getCurrentUser } from './authService';
import { handleError } from './utils';

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      handleError(error);
      setError('Failed to fetch current user');
    } finally {
      setLoading(false);
    }
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      setUser(loggedInUser);
    } catch (error) {
      handleError(error);
      setError('Failed to login');
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutUser = useCallback(async () => {
    setLoading(true);
    try {
      await logout();
      setUser(null);
    } catch (error) {
      handleError(error);
      setError('Failed to logout');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    user,
    loading,
    error,
    loginUser,
    logoutUser,
  };
}
