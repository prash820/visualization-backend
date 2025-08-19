import { apiClient } from './apiClient';

export class CommentService {
  async getAll(): Promise<any[]> {
    try {
      const response = await apiClient.get('/comments');
      return response.data;
    } catch (error) {
      console.error('Error fetching Comments:', error);
      throw new Error('Failed to fetch Comments');
    }
  }

  async getById(id: string): Promise<any | null> {
    try {
      const response = await apiClient.get(`/comments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Comment by ID:', error);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    try {
      const response = await apiClient.post('/comments', data);
      return response.data;
    } catch (error) {
      console.error('Error creating Comment:', error);
      throw new Error('Failed to create Comment');
    }
  }

  async update(id: string, data: any): Promise<any | null> {
    try {
      const response = await apiClient.put(`/comments/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating Comment:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/comments/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting Comment:', error);
      return false;
    }
  }
}

export default CommentService;