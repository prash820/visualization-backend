import { apiClient } from './apiClient';

export class TaskService {

  async getAll(): Promise<Task[]> {
    try {
      const response = await apiClient.get('/tasks');
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }
  async getById(id: string): Promise<Task | null> {
    try {
      const response = await apiClient.get(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching task by ID:', error);
      return null;
    }
  }
  async create(data: Partial<Task>): Promise<Task> {
    try {
      const response = await apiClient.post('/tasks', data);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }
  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    try {
      const response = await apiClient.put(`/tasks/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  }
  async delete(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/tasks/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }
}

export default TaskService;