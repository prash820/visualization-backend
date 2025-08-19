// useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import apiService from './apiService';
import { AppContext } from './types';

interface AuthState {
  isAuthenticated: boolean;
  user: AppContext | null;
  loading: boolean;
  error: string | null;
}

interface UseAuthResult extends AuthState {
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  });

  const login = useCallback(async (credentials: { username: string; password: string }) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userData = await apiService.login(credentials);
      setAuthState({ isAuthenticated: true, user: userData, loading: false, error: null });
    } catch (err) {
      setAuthState(prev => ({ ...prev, loading: false, error: 'Login failed' }));
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({ isAuthenticated: false, user: null, loading: false, error: null });
  }, []);

  const refreshAuth = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userData = await apiService.getAppData();
      setAuthState({ isAuthenticated: true, user: userData, loading: false, error: null });
    } catch (err) {
      setAuthState(prev => ({ ...prev, loading: false, error: 'Failed to refresh authentication' }));
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return {
    ...authState,
    login,
    logout,
    refreshAuth
  };
}

// Example apiService methods for authentication
// Add these methods to apiService.ts
//
// async login(credentials: { username: string; password: string }): Promise<AppContext> {
//   try {
//     const response = await this.apiClient.post('/login', credentials);
//     return response.data;
//   } catch (error) {
//     this.handleError(error);
//     throw new Error('Login failed');
//   }
// }