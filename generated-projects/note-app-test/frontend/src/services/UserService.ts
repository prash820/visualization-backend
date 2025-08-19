import { apiClient } from './apiClient';

export class UserService {

  async getAll(): Promise<User[]> {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }
  async getById(id: string): Promise<User | null> {
    try {
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }
  async create(data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.post('/users', data);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }
  async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }
  async delete(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/users/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
}

export default UserService;