// constants.ts

import { AppSummary, UMLDiagrams, Infrastructure, UserRequest, AppContext } from './types';

// Constants for App Summary
export const APP_SUMMARY: AppSummary = {
  name: 'TestApp',
  description: 'A test application'
};

// Constants for UML Diagrams
export const UML_DIAGRAMS: UMLDiagrams = {
  frontendComponent: 'flowchart TB\nA[App] --> B[Component]',
  backendComponent: 'flowchart TB\nA[Controller] --> B[Service]'
};

// Constants for Infrastructure
export const INFRASTRUCTURE: Infrastructure = {
  provider: 'aws',
  region: 'us-east-1'
};

// Constants for User Request
export const USER_REQUEST: UserRequest = {
  createSimpleTestApp: true
};

// Complete App Context
export const APP_CONTEXT: AppContext = {
  analysis: {
    appSummary: APP_SUMMARY
  },
  umlDiagrams: UML_DIAGRAMS,
  infrastructure: INFRASTRUCTURE,
  userRequest: USER_REQUEST
};

// Function to get App Context
export function getAppContext(): AppContext {
  return APP_CONTEXT;
}

// Example usage of validateAppContext function
if (!validateAppContext(APP_CONTEXT)) {
  console.error('AppContext validation failed.');
} else {
  console.log('AppContext is valid.');
}
