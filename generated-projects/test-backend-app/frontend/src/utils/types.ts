// types.ts

// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'freelancer' | 'client';

// Project related types
export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

// Task related types
export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus;
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

// Error handling
export interface AppError {
  message: string;
  code?: number;
}

// Utility types
export type Nullable<T> = T | null;

// Example usage of utility types
export type OptionalUser = Nullable<User>;

// Ensure all imports are resolved
// Note: This is a utility file, so imports would be resolved in the components or services using these types.