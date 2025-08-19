import { apiClient } from './apiClient';

export class UserService {

  async getAll(): Promise<User[]> {
    // TODO: Implement getAll
    throw new Error('Not implemented');
  }
  async getById(id: string): Promise<User | null> {
    // TODO: Implement getById
    throw new Error('Not implemented');
  }
  async create(data: Partial<User>): Promise<User> {
    // TODO: Implement create
    throw new Error('Not implemented');
  }
  async update(id: string, data: Partial<User>): Promise<User | null> {
    // TODO: Implement update
    throw new Error('Not implemented');
  }
  async delete(id: string): Promise<boolean> {
    // TODO: Implement delete
    throw new Error('Not implemented');
  }
}

export default UserService;