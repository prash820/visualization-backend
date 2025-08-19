// utils.ts

import { AppContext } from './types';

// Utility function to log application context
export function logAppContext(context: AppContext): void {
  console.log('App Name:', context.analysis.appSummary.name);
  console.log('App Description:', context.analysis.appSummary.description);
  console.log('Frontend UML Diagram:', context.umlDiagrams.frontendComponent);
  console.log('Backend UML Diagram:', context.umlDiagrams.backendComponent);
  console.log('AWS Provider:', context.infrastructure.provider);
  console.log('AWS Region:', context.infrastructure.region);
}

// Utility function to check if a given component exists in the frontend UML diagram
export function isFrontendComponentExists(componentName: string, context: AppContext): boolean {
  return context.umlDiagrams.frontendComponent.includes(componentName);
}

// Utility function to check if a given component exists in the backend UML diagram
export function isBackendComponentExists(componentName: string, context: AppContext): boolean {
  return context.umlDiagrams.backendComponent.includes(componentName);
}

// Utility function to validate AWS configuration
export function validateAWSConfig(context: AppContext): void {
  if (context.infrastructure.provider !== 'aws') {
    throw new Error('Invalid AWS provider configuration.');
  }
  if (context.infrastructure.region !== 'us-east-1') {
    throw new Error('Invalid AWS region configuration.');
  }
}

// Example of using the utility functions
try {
  const context: AppContext = {
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
    }
  };

  logAppContext(context);
  console.log('Is Frontend Component Exists:', isFrontendComponentExists('Component', context));
  console.log('Is Backend Component Exists:', isBackendComponentExists('Service', context));
  validateAWSConfig(context);
} catch (error) {
  console.error('Error:', error.message);
}
