export interface DeploymentConfig {
  // Application Type
  appType: 'frontend' | 'backend' | 'fullstack' | 'static';
  framework?: 'react' | 'vue' | 'angular' | 'nextjs' | 'express' | 'fastapi' | 'django' | 'flask' | 'spring' | 'go';
  
  // Build Configuration
  buildCommand?: string;
  outputDirectory?: string;
  entryPoint?: string;
  runtime?: 'nodejs18.x' | 'python3.11' | 'java11' | 'go1.x';
  
  // Database Configuration
  databaseType?: 'rds' | 'dynamodb' | 'none';
  databaseName?: string;
  connectionString?: string;
  
  // Environment Variables
  environmentVariables: Record<string, string>;
  
  // Resource Associations
  resources: {
    database?: string;
    apiGateway?: string;
    s3Bucket?: string;
    cloudFront?: string;
    lambda?: string;
  };
  
  // Deployment Settings
  deploymentSettings: {
    autoDeploy: boolean;
    rollbackOnFailure: boolean;
    healthCheckPath?: string;
    corsEnabled: boolean;
    corsOrigins?: string[];
  };
}

export interface DeploymentWizardStep {
  id: string;
  title: string;
  description: string;
  fields: DeploymentWizardField[];
  validation?: (values: any) => string[] | null;
}

export interface DeploymentWizardField {
  name: keyof DeploymentConfig | string;
  type: 'select' | 'text' | 'textarea' | 'checkbox' | 'radio';
  label: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
}

export interface DeploymentWizardState {
  currentStep: number;
  config: Partial<DeploymentConfig>;
  errors: Record<string, string[]>;
  isValid: boolean;
}

export interface DeploymentPreview {
  resources: {
    type: string;
    name: string;
    configuration: any;
  }[];
  environmentVariables: Record<string, string>;
  buildSteps: string[];
  deploymentSteps: string[];
  estimatedCost: number;
  estimatedTime: string;
} 