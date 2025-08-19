import { apiClient } from './apiClient';

export class PostService {
  async getAll(): Promise<any[]> {
    try {
      const response = await apiClient.get('/posts');
      return response.data;
    } catch (error) {
      console.error('Error fetching Posts:', error);
      throw new Error('Failed to fetch Posts');
    }
  }

  async getById(id: string): Promise<any | null> {
    try {
      const response = await apiClient.get(`/posts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Post by ID:', error);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    try {
      const response = await apiClient.post('/posts', data);
      return response.data;
    } catch (error) {
      console.error('Error creating Post:', error);
      throw new Error('Failed to create Post');
    }
  }

  async update(id: string, data: any): Promise<any | null> {
    try {
      const response = await apiClient.put(`/posts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating Post:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/posts/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting Post:', error);
      return false;
    }
  }
}

export default PostService;