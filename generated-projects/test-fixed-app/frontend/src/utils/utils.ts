// utils.ts

import { AppContext } from './types';

// Utility function to log App Context
export function logAppContext(context: AppContext): void {
  console.log('App Context:', context);
}

// Utility function to safely access nested properties
export function getNestedProperty<T, K extends keyof T>(obj: T, key: K): T[K] | undefined {
  try {
    return obj[key];
  } catch (error) {
    console.error('Error accessing property:', error);
    return undefined;
  }
}

// Utility function to update App Context
export function updateAppContext(context: AppContext, newValues: Partial<AppContext>): AppContext {
  return { ...context, ...newValues };
}

// Utility function to check if the app is a test app
export function isTestApp(context: AppContext): boolean {
  return context.userRequest.createSimpleTestApp;
}

// Example usage of utility functions
const appContext: AppContext = {
  analysis: {
    appSummary: {
      name: 'TestApp',
      description: 'A test application'
    }
  },
  umlDiagrams: {
    frontendComponent: 'flowchart TB\nA[App] --> B[Component]',
    backendComponent: 'flowchart TB\nA[Controller] --> B[Service]'
  },
  infrastructure: {
    provider: 'aws',
    region: 'us-east-1'
  },
  userRequest: {
    createSimpleTestApp: true
  }
};

logAppContext(appContext);
console.log('Is Test App:', isTestApp(appContext));
const updatedContext = updateAppContext(appContext, { userRequest: { createSimpleTestApp: false } });
console.log('Updated Context:', updatedContext);
