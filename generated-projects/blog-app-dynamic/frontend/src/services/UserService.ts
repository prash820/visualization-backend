import { apiClient } from './apiClient';

export class UserService {
  async getAll(): Promise<any[]> {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching Users:', error);
      throw new Error('Failed to fetch Users');
    }
  }

  async getById(id: string): Promise<any | null> {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching User by ID:', error);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    try {
      const response = await apiClient.post('/users', data);
      return response.data;
    } catch (error) {
      console.error('Error creating User:', error);
      throw new Error('Failed to create User');
    }
  }

  async update(id: string, data: any): Promise<any | null> {
    try {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating User:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/users/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting User:', error);
      return false;
    }
  }
}

export default UserService;