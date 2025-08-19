// TaskService.ts
import { useState, useEffect, useCallback } from 'react';
import { Task, ApiError } from './types';
import { fetchTasks, addTask, markTaskComplete } from './apiService';
import { handleApiError } from './utils';

interface UseTaskServiceResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  loadTasks: (projectId: string) => Promise<void>;
  addNewTask: (taskData: Partial<Task>) => Promise<Task>;
  completeTask: (taskId: string) => Promise<void>;
}

export function useTaskService(): UseTaskServiceResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const fetchedTasks = await fetchTasks(projectId);
      setTasks(fetchedTasks);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addNewTask = useCallback(async (taskData: Partial<Task>): Promise<Task> => {
    setLoading(true);
    try {
      const newTask = await addTask(taskData);
      setTasks((prevTasks) => [...prevTasks, newTask]);
      return newTask;
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    setLoading(true);
    try {
      await markTaskComplete(taskId);
      setTasks((prevTasks) => prevTasks.map(task => task.taskId === taskId ? { ...task, status: 'completed' } : task));
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data loading logic can be placed here if needed
  }, []);

  return {
    tasks,
    loading,
    error,
    loadTasks,
    addNewTask,
    completeTask,
  };
}