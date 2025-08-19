// constants.ts

// Application Constants
export const APP_NAME = "FreelanceApp";
export const APP_DESCRIPTION = "A freelance management application";

// AWS Configuration
export const AWS_REGION = "us-east-1";

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  FREELANCER: 'freelancer',
  CLIENT: 'client'
} as const;

// Project Statuses
export const PROJECT_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
} as const;

// Task Statuses
export const TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done'
} as const;

// Error Codes
export const ERROR_CODES = {
  GENERIC_ERROR: 1000,
  NOT_FOUND: 1001,
  UNAUTHORIZED: 1002
};

// Example of using constants in error handling
export interface AppError {
  message: string;
  code?: number;
}

export const createAppError = (message: string, code: number = ERROR_CODES.GENERIC_ERROR): AppError => ({
  message,
  code
});

// Example usage of constants
const exampleError = createAppError('An unknown error occurred', ERROR_CODES.GENERIC_ERROR);
console.log(`Error: ${exampleError.message}, Code: ${exampleError.code}`);

// Ensure all imports are resolved
// Note: This is a utility file, so imports would be resolved in the components or services using these constants.