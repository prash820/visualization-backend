// utils.ts

import { User, Project, Task, AppError, UserRole, ProjectStatus, TaskStatus } from './types';
import { createAppError, ERROR_CODES } from './constants';

// Utility functions

// User utilities
export const findUserById = (users: User[], userId: string): User | null => {
  return users.find(user => user.id === userId) || null;
};

export const isUserRole = (user: User, role: UserRole): boolean => {
  return user.role === role;
};

// Project utilities
export const findProjectById = (projects: Project[], projectId: string): Project | null => {
  return projects.find(project => project.id === projectId) || null;
};

export const isProjectStatus = (project: Project, status: ProjectStatus): boolean => {
  return project.status === status;
};

// Task utilities
export const findTaskById = (tasks: Task[], taskId: string): Task | null => {
  return tasks.find(task => task.id === taskId) || null;
};

export const isTaskStatus = (task: Task, status: TaskStatus): boolean => {
  return task.status === status;
};

// Error handling utilities
export const handleAppError = (error: AppError): void => {
  console.error(`Error: ${error.message}, Code: ${error.code || ERROR_CODES.GENERIC_ERROR}`);
};

// Example usage of utility functions
const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'freelancer' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'client' }
];

const projects: Project[] = [
  { id: '1', name: 'Project A', description: 'Description A', ownerId: '1', status: 'active' }
];

const tasks: Task[] = [
  { id: '1', title: 'Task 1', description: 'Task 1 description', projectId: '1', assigneeId: '1', status: 'todo' }
];

const user = findUserById(users, '1');
if (user) {
  console.log(`Found user: ${user.name}`);
}

const project = findProjectById(projects, '1');
if (project) {
  console.log(`Found project: ${project.name}`);
}

const task = findTaskById(tasks, '1');
if (task) {
  console.log(`Found task: ${task.title}`);
}

handleAppError(createAppError('An error occurred', ERROR_CODES.NOT_FOUND));
