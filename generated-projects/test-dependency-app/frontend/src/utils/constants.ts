// constants.ts

// Import necessary types
import { AppSummary, FrontendComponent, BackendComponent, AWSConfig, AppContext } from './types';

// Define constants for the application
export const APP_NAME: string = "TestApp";
export const APP_DESCRIPTION: string = "A test application";

// Define constants for UML diagrams
export const FRONTEND_COMPONENT_DIAGRAM: string = "flowchart TB\nA[App] --> B[Component]";
export const BACKEND_COMPONENT_DIAGRAM: string = "flowchart TB\nA[Controller] --> B[Service]";

// Define constants for AWS infrastructure
export const AWS_PROVIDER: string = "aws";
export const AWS_REGION: string = "us-east-1";

// Define a constant for the entire application context
export const APP_CONTEXT: AppContext = {
  analysis: {
    appSummary: {
      name: APP_NAME,
      description: APP_DESCRIPTION
    }
  },
  umlDiagrams: {
    frontendComponent: FRONTEND_COMPONENT_DIAGRAM,
    backendComponent: BACKEND_COMPONENT_DIAGRAM
  },
  infrastructure: {
    provider: AWS_PROVIDER,
    region: AWS_REGION
  }
};

// Function to validate the application context
export function validateAppContext(context: AppContext): void {
  if (!context.analysis || !context.analysis.appSummary) {
    throw new Error("Invalid app context: Missing analysis or app summary.");
  }
  if (!context.umlDiagrams || !context.umlDiagrams.frontendComponent || !context.umlDiagrams.backendComponent) {
    throw new Error("Invalid app context: Missing UML diagrams.");
  }
  if (!context.infrastructure || !context.infrastructure.provider || !context.infrastructure.region) {
    throw new Error("Invalid app context: Missing infrastructure configuration.");
  }
}
