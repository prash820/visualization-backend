// useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from './types';
import { logIn, signUp, getCurrentUser, logOut } from './authService';
import { handleApiError } from './utils';

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  loginUser: (email: string, password: string) => Promise<void>;
  signUpUser: (userData: Partial<User>) => Promise<void>;
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
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const authResponse: AuthResponse = await logIn(email, password);
      setUser(authResponse.user);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpUser = useCallback(async (userData: Partial<User>) => {
    setLoading(true);
    try {
      const authResponse: AuthResponse = await signUp(userData);
      setUser(authResponse.user);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutUser = useCallback(async () => {
    setLoading(true);
    try {
      await logOut();
      setUser(null);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
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
    signUpUser,
    logoutUser,
  };
}
