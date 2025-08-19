// ProjectController.tsx

import React, { useState, useEffect } from 'react';
import { Project, AppError, ProjectStatus } from './types';
import { ProjectService } from './ProjectService';
import { handleAppError, createAppError } from './utils';
import { ERROR_CODES } from './constants';

interface ProjectControllerProps {
  projectService: ProjectService;
}

const ProjectController: React.FC<ProjectControllerProps> = ({ projectService }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    try {
      const allProjects = projectService.getProjectsByStatus('active'); // Example status
      setProjects(allProjects);
    } catch (err) {
      const appError = createAppError('Failed to fetch projects', ERROR_CODES.GENERIC_ERROR);
      setError(appError);
      handleAppError(appError);
    }
  }, [projectService]);

  const handleSelectProject = (projectId: string) => {
    try {
      const project = projectService.getProjectById(projectId);
      if (!project) {
        throw createAppError('Project not found', ERROR_CODES.NOT_FOUND);
      }
      setSelectedProject(project);
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      handleAppError(appError);
    }
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Project Management</h1>
      <ul>
        {projects.map(project => (
          <li key={project.id} onClick={() => handleSelectProject(project.id)}>
            {project.name} ({project.status})
          </li>
        ))}
      </ul>
      {selectedProject && (
        <div>
          <h2>Selected Project</h2>
          <p>Name: {selectedProject.name}</p>
          <p>Description: {selectedProject.description}</p>
          <p>Status: {selectedProject.status}</p>
        </div>
      )}
    </div>
  );
};

export default ProjectController;
