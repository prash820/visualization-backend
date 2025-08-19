// useApi.ts

import { useState, useEffect, useCallback } from 'react';
import { ApiService } from './apiService';
import { User, Project, Task, AppError } from './types';
import { handleAppError } from './utils';

interface UseApiReturn {
  getUserById: (userId: string) => Promise<User | null>;
  getProjectById: (projectId: string) => Promise<Project | null>;
  getTaskById: (taskId: string) => Promise<Task | null>;
  addUser: (newUser: User) => Promise<void>;
  addProject: (newProject: Project) => Promise<void>;
  addTask: (newTask: Task) => Promise<void>;
  updateUser: (userId: string, updatedInfo: Partial<User>) => Promise<void>;
  updateProject: (projectId: string, updatedInfo: Partial<Project>) => Promise<void>;
  updateTask: (taskId: string, updatedInfo: Partial<Task>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  error: AppError | null;
}

export const useApi = (users: User[], projects: Project[], tasks: Task[]): UseApiReturn => {
  const [error, setError] = useState<AppError | null>(null);
  const apiService = new ApiService(users, projects, tasks);

  const handleError = useCallback((error: AppError) => {
    setError(error);
    handleAppError(error);
  }, []);

  const getUserById = useCallback(async (userId: string): Promise<User | null> => {
    try {
      return apiService.getUserById(userId);
    } catch (error) {
      handleError(error as AppError);
      return null;
    }
  }, [apiService, handleError]);

  const getProjectById = useCallback(async (projectId: string): Promise<Project | null> => {
    try {
      return apiService.getProjectById(projectId);
    } catch (error) {
      handleError(error as AppError);
      return null;
    }
  }, [apiService, handleError]);

  const getTaskById = useCallback(async (taskId: string): Promise<Task | null> => {
    try {
      return apiService.getTaskById(taskId);
    } catch (error) {
      handleError(error as AppError);
      return null;
    }
  }, [apiService, handleError]);

  const addUser = useCallback(async (newUser: User): Promise<void> => {
    try {
      apiService.addUser(newUser);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const addProject = useCallback(async (newProject: Project): Promise<void> => {
    try {
      apiService.addProject(newProject);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const addTask = useCallback(async (newTask: Task): Promise<void> => {
    try {
      apiService.addTask(newTask);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const updateUser = useCallback(async (userId: string, updatedInfo: Partial<User>): Promise<void> => {
    try {
      apiService.updateUser(userId, updatedInfo);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const updateProject = useCallback(async (projectId: string, updatedInfo: Partial<Project>): Promise<void> => {
    try {
      apiService.updateProject(projectId, updatedInfo);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const updateTask = useCallback(async (taskId: string, updatedInfo: Partial<Task>): Promise<void> => {
    try {
      apiService.updateTask(taskId, updatedInfo);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    try {
      apiService.deleteUser(userId);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      apiService.deleteProject(projectId);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    try {
      apiService.deleteTask(taskId);
    } catch (error) {
      handleError(error as AppError);
    }
  }, [apiService, handleError]);

  return {
    getUserById,
    getProjectById,
    getTaskById,
    addUser,
    addProject,
    addTask,
    updateUser,
    updateProject,
    updateTask,
    deleteUser,
    deleteProject,
    deleteTask,
    error
  };
};
