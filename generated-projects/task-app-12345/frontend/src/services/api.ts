import axios from 'axios';

const API_URL = 'https://api.example.com';

export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data;
};

export const fetchProjects = async () => {
  const response = await axios.get(`${API_URL}/projects`);
  return response.data;
};