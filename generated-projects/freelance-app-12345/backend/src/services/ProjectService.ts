import { Project } from '../models/Project';

export class ProjectService {
  static async createProject(data: any) {
    const project = new Project(data);
    await project.save();
    return project;
  }
}