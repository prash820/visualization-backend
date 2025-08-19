// apiService.ts

import { User, Project, Task, Message, AuthResponse, ApiError } from './types';
import { handleApiError } from './utils';

// API endpoint constants
const API_BASE_URL = 'https://api.freelanceprojectmanager.com';
const AUTH_ENDPOINT = `${API_BASE_URL}/auth`;
const PROJECTS_ENDPOINT = `${API_BASE_URL}/projects`;
const TASKS_ENDPOINT = `${API_BASE_URL}/tasks`;
const MESSAGES_ENDPOINT = `${API_BASE_URL}/messages`;

// Function to sign up a new user
export async function signUp(userData: Partial<User>): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_ENDPOINT}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Failed to sign up');
    }

    const authResponse: AuthResponse = await response.json();
    return authResponse;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to log in a user
export async function logIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${AUTH_ENDPOINT}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Failed to log in');
    }

    const authResponse: AuthResponse = await response.json();
    return authResponse;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to fetch projects
export async function fetchProjects(userId: string): Promise<Project[]> {
  try {
    const response = await fetch(`${PROJECTS_ENDPOINT}?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    const projects: Project[] = await response.json();
    return projects;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to create a new project
export async function createProject(projectData: Partial<Project>): Promise<Project> {
  try {
    const response = await fetch(PROJECTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      throw new Error('Failed to create project');
    }

    const project: Project = await response.json();
    return project;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to fetch tasks for a project
export async function fetchTasks(projectId: string): Promise<Task[]> {
  try {
    const response = await fetch(`${TASKS_ENDPOINT}?projectId=${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    const tasks: Task[] = await response.json();
    return tasks;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to add a task to a project
export async function addTask(taskData: Partial<Task>): Promise<Task> {
  try {
    const response = await fetch(TASKS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      throw new Error('Failed to add task');
    }

    const task: Task = await response.json();
    return task;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to mark a task as complete
export async function markTaskComplete(taskId: string): Promise<void> {
  try {
    const response = await fetch(`${TASKS_ENDPOINT}/${taskId}/complete`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error('Failed to mark task as complete');
    }
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to fetch messages for a project
export async function fetchMessages(projectId: string): Promise<Message[]> {
  try {
    const response = await fetch(`${MESSAGES_ENDPOINT}?projectId=${projectId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    const messages: Message[] = await response.json();
    return messages;
  } catch (error) {
    throw handleApiError(error);
  }
}

// Function to send a message
export async function sendMessage(messageData: Partial<Message>): Promise<Message> {
  try {
    const response = await fetch(MESSAGES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const message: Message = await response.json();
    return message;
  } catch (error) {
    throw handleApiError(error);
  }
}
