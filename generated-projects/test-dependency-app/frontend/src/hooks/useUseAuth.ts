// useAuth.ts

import { useState, useEffect, useCallback } from 'react';
import apiService from './apiService';
import { AxiosRequestConfig } from 'axios';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface UseAuthResponse {
  user: AuthResponse['user'] | null;
  token: string | null;
  error: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

function useAuth(): UseAuthResponse {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.post<AuthResponse>('/auth/login', { email, password });
      setUser(response.user);
      setToken(response.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    // Optionally, implement token refresh or check for existing session here
  }, []);

  return { user, token, error, loading, login, logout };
}

export default useAuth;
