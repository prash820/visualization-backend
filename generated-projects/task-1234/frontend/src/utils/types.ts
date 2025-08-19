// types.ts

// Interface for a user
export interface User {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'freelancer' | 'client';
}

// Interface for a project
export interface Project {
  projectId: string;
  title: string;
  description: string;
  clientId: string;
  freelancerId?: string;
}

// Interface for a task
export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  status: 'pending' | 'completed';
}

// Interface for a message
export interface Message {
  messageId: string;
  projectId: string;
  senderId: string;
  content: string;
  timestamp: Date;
}

// Type for authentication response
export interface AuthResponse {
  token: string;
  user: User;
}

// Type for API error
export interface ApiError {
  message: string;
  code?: number;
}

// Utility function to handle API errors
export function handleApiError(error: any): ApiError {
  if (error.response && error.response.data) {
    return { message: error.response.data.message, code: error.response.status };
  }
  return { message: error.message || 'An unknown error occurred' };
}

// Utility function to generate unique IDs
export function generateUniqueId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Utility function to validate email format
export function validateEmail(email: string): boolean {
  const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(email);
}

// Utility function to validate password strength
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}
