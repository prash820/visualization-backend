// ProjectModel.tsx

import React, { useState, useEffect } from 'react';
import { Project, AppError, ProjectStatus } from './types';
import { findProjectById, handleAppError } from './utils';
import { createAppError, ERROR_CODES } from './constants';

interface ProjectModelProps {
  projects: Project[];
  projectId: string;
}

const ProjectModel: React.FC<ProjectModelProps> = ({ projects, projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    try {
      const foundProject = findProjectById(projects, projectId);
      if (!foundProject) {
        throw createAppError('Project not found', ERROR_CODES.NOT_FOUND);
      }
      setProject(foundProject);
    } catch (err) {
      setError(err as AppError);
      handleAppError(err as AppError);
    }
  }, [projects, projectId]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Project Details</h1>
      <p>Name: {project.name}</p>
      <p>Description: {project.description}</p>
      <p>Status: {project.status}</p>
    </div>
  );
};

export default ProjectModel;
