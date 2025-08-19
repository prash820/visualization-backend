import { apiClient } from './apiClient';

export class ProjectService {

  async getAll(): Promise<Project[]> {
    // TODO: Implement getAll
    throw new Error('Not implemented');
  }
  async getById(id: string): Promise<Project | null> {
    // TODO: Implement getById
    throw new Error('Not implemented');
  }
  async create(data: Partial<Project>): Promise<Project> {
    // TODO: Implement create
    throw new Error('Not implemented');
  }
  async update(id: string, data: Partial<Project>): Promise<Project | null> {
    // TODO: Implement update
    throw new Error('Not implemented');
  }
  async delete(id: string): Promise<boolean> {
    // TODO: Implement delete
    throw new Error('Not implemented');
  }
}

export default ProjectService;