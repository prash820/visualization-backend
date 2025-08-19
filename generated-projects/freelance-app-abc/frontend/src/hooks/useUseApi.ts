// useApi.ts

import { useState, useEffect, useCallback } from 'react';
import { Project, Task, Message, ApiError } from './types';
import { fetchProjects, createProject, fetchTasks, addTask, markTaskComplete, fetchMessages, sendMessage } from './apiService';
import { handleApiError } from './utils';

interface UseApiResult {
  projects: Project[];
  tasks: Task[];
  messages: Message[];
  loading: boolean;
  error: string | null;
  loadProjects: (userId: string) => Promise<void>;
  createNewProject: (projectData: Partial<Project>) => Promise<Project>;
  loadTasks: (projectId: string) => Promise<void>;
  addNewTask: (taskData: Partial<Task>) => Promise<Task>;
  completeTask: (taskId: string) => Promise<void>;
  loadMessages: (projectId: string) => Promise<void>;
  sendNewMessage: (messageData: Partial<Message>) => Promise<Message>;
}

export function useApi(): UseApiResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const fetchedProjects = await fetchProjects(userId);
      setProjects(fetchedProjects);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewProject = useCallback(async (projectData: Partial<Project>): Promise<Project> => {
    setLoading(true);
    try {
      const newProject = await createProject(projectData);
      setProjects((prevProjects) => [...prevProjects, newProject]);
      return newProject;
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

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

  const loadMessages = useCallback(async (projectId: string) => {
    setLoading(true);
    try {
      const fetchedMessages = await fetchMessages(projectId);
      setMessages(fetchedMessages);
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendNewMessage = useCallback(async (messageData: Partial<Message>): Promise<Message> => {
    setLoading(true);
    try {
      const newMessage = await sendMessage(messageData);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      return newMessage;
    } catch (error) {
      const apiError = handleApiError(error);
      setError(apiError.message);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data loading logic can be placed here if needed
  }, []);

  return {
    projects,
    tasks,
    messages,
    loading,
    error,
    loadProjects,
    createNewProject,
    loadTasks,
    addNewTask,
    completeTask,
    loadMessages,
    sendNewMessage,
  };
}
