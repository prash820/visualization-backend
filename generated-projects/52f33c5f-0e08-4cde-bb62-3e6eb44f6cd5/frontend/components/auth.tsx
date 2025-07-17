import apiClient from './api';

export const login = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const register = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};