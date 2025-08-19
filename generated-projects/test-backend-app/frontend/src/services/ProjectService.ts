// ProjectService.ts

import { Project, AppError, ProjectStatus } from './types';
import { createAppError, ERROR_CODES } from './constants';
import { findProjectById, isProjectStatus, handleAppError } from './utils';

export class ProjectService {
  private projects: Project[];

  constructor(projects: Project[]) {
    this.projects = projects;
  }

  public getProjectById(projectId: string): Project | null {
    try {
      const project = findProjectById(this.projects, projectId);
      if (!project) {
        throw createAppError('Project not found', ERROR_CODES.NOT_FOUND);
      }
      return project;
    } catch (error) {
      handleAppError(error as AppError);
      return null;
    }
  }

  public getProjectsByStatus(status: ProjectStatus): Project[] {
    return this.projects.filter(project => isProjectStatus(project, status));
  }

  public addProject(newProject: Project): void {
    if (this.projects.some(project => project.id === newProject.id)) {
      handleAppError(createAppError('Project already exists', ERROR_CODES.GENERIC_ERROR));
      return;
    }
    this.projects.push(newProject);
  }

  public updateProject(projectId: string, updatedInfo: Partial<Project>): void {
    try {
      const projectIndex = this.projects.findIndex(project => project.id === projectId);
      if (projectIndex === -1) {
        throw createAppError('Project not found', ERROR_CODES.NOT_FOUND);
      }
      this.projects[projectIndex] = { ...this.projects[projectIndex], ...updatedInfo };
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public deleteProject(projectId: string): void {
    try {
      const projectIndex = this.projects.findIndex(project => project.id === projectId);
      if (projectIndex === -1) {
        throw createAppError('Project not found', ERROR_CODES.NOT_FOUND);
      }
      this.projects.splice(projectIndex, 1);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }
}

// Example usage
const projects: Project[] = [
  { id: '1', name: 'Project A', description: 'Description A', ownerId: '1', status: 'active' },
  { id: '2', name: 'Project B', description: 'Description B', ownerId: '2', status: 'completed' }
];

const projectService = new ProjectService(projects);
const project = projectService.getProjectById('1');
if (project) {
  console.log(`Project found: ${project.name}`);
}

projectService.addProject({ id: '3', name: 'Project C', description: 'Description C', ownerId: '3', status: 'active' });
console.log(projectService.getProjectsByStatus('active'));

projectService.updateProject('1', { name: 'Project A Updated' });
console.log(projectService.getProjectById('1'));

projectService.deleteProject('2');
console.log(projectService.getProjectById('2'));