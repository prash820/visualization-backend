// types.ts

// Define a type for the application summary
export interface AppSummary {
  name: string;
  description: string;
}

// Define a type for frontend component structure
export interface FrontendComponent {
  id: string;
  name: string;
  children?: FrontendComponent[];
}

// Define a type for backend component structure
export interface BackendComponent {
  id: string;
  name: string;
  dependencies?: BackendComponent[];
}

// Define a type for AWS infrastructure configuration
export interface AWSConfig {
  provider: string;
  region: string;
}

// Define a type for the entire application context
export interface AppContext {
  analysis: {
    appSummary: AppSummary;
  };
  umlDiagrams: {
    frontendComponent: string;
    backendComponent: string;
  };
  infrastructure: AWSConfig;
}

// Example usage of the types
export const appContext: AppContext = {
  analysis: {
    appSummary: {
      name: "TestApp",
      description: "A test application"
    }
  },
  umlDiagrams: {
    frontendComponent: "flowchart TB\nA[App] --> B[Component]",
    backendComponent: "flowchart TB\nA[Controller] --> B[Service]"
  },
  infrastructure: {
    provider: "aws",
    region: "us-east-1"
  }
};

// Error handling example
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
