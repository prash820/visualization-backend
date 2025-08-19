import { apiClient } from './apiClient';

export class TaskService {

  async getAll(): Promise<Task[]> {
    // TODO: Implement getAll
    throw new Error('Not implemented');
  }
  async getById(id: string): Promise<Task | null> {
    // TODO: Implement getById
    throw new Error('Not implemented');
  }
  async create(data: Partial<Task>): Promise<Task> {
    // TODO: Implement create
    throw new Error('Not implemented');
  }
  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    // TODO: Implement update
    throw new Error('Not implemented');
  }
  async delete(id: string): Promise<boolean> {
    // TODO: Implement delete
    throw new Error('Not implemented');
  }
}

export default TaskService;