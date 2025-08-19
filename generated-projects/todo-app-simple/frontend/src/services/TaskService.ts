import { apiClient } from './apiClient';

export class TaskService {
  async getAll(): Promise<any[]> {
    try {
      const response = await apiClient.get('/tasks');
      return response.data;
    } catch (error) {
      console.error('Error fetching Tasks:', error);
      throw new Error('Failed to fetch Tasks');
    }
  }

  async getById(id: string): Promise<any | null> {
    try {
      const response = await apiClient.get(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Task by ID:', error);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    try {
      const response = await apiClient.post('/tasks', data);
      return response.data;
    } catch (error) {
      console.error('Error creating Task:', error);
      throw new Error('Failed to create Task');
    }
  }

  async update(id: string, data: any): Promise<any | null> {
    try {
      const response = await apiClient.put(`/tasks/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating Task:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/tasks/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting Task:', error);
      return false;
    }
  }
}

export default TaskService;