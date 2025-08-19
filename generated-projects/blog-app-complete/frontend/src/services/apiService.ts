// Complete API service code with proper TypeScript types
import axios from 'axios';
import { Post, Comment, User } from '../utils/types';

const API_URL = 'https://api.example.com';

export const fetchPosts = async (): Promise<Post[]> => {
  const response = await axios.get(`${API_URL}/posts`);
  return response.data;
};

export const fetchComments = async (postId: string): Promise<Comment[]> => {
  const response = await axios.get(`${API_URL}/posts/${postId}/comments`);
  return response.data;
};

export const loginUser = async (credentials: { username: string; password: string }): Promise<User> => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data;
};