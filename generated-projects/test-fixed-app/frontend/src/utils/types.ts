// types.ts

// Define interfaces and types for the application

// Interface for App Summary
export interface AppSummary {
  name: string;
  description: string;
}

// Type for UML Diagrams
export type UMLDiagrams = {
  frontendComponent: string;
  backendComponent: string;
};

// Interface for Infrastructure
export interface Infrastructure {
  provider: string;
  region: string;
}

// Type for User Request
export type UserRequest = {
  createSimpleTestApp: boolean;
};

// Define a type for the complete app context
export interface AppContext {
  analysis: {
    appSummary: AppSummary;
  };
  umlDiagrams: UMLDiagrams;
  infrastructure: Infrastructure;
  userRequest: UserRequest;
}

// Example function to validate AppContext
export function validateAppContext(context: AppContext): boolean {
  try {
    if (!context.analysis || !context.umlDiagrams || !context.infrastructure || !context.userRequest) {
      throw new Error('Invalid AppContext: Missing properties');
    }
    return true;
  } catch (error) {
    console.error('Validation Error:', error);
    return false;
  }
}
