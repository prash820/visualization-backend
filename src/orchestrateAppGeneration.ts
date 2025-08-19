/**
 * Infrastructure Context Interface
 * Defines the infrastructure context for application generation
 */

export interface InfrastructureContext {
  provider: 'aws' | 'azure' | 'gcp' | 'local';
  region: string;
  services: {
    database?: {
      type: 'dynamodb' | 'rds' | 'mongodb' | 'postgresql';
      name: string;
      tables: string[];
    };
    storage?: {
      type: 's3' | 'blob' | 'cloud-storage';
      name: string;
      buckets: string[];
    };
    compute?: {
      type: 'lambda' | 'ec2' | 'container' | 'function';
      name: string;
      functions: string[];
    };
    api?: {
      type: 'api-gateway' | 'load-balancer' | 'app-service';
      name: string;
      endpoints: string[];
    };
    auth?: {
      type: 'cognito' | 'auth0' | 'firebase-auth';
      name: string;
    };
    monitoring?: {
      type: 'cloudwatch' | 'application-insights' | 'stackdriver';
      name: string;
    };
  };
  deployment: {
    type: 'serverless' | 'container' | 'vm' | 'static';
    environment: 'development' | 'staging' | 'production';
    autoScaling: boolean;
    loadBalancing: boolean;
  };
  networking: {
    vpc?: {
      id: string;
      subnets: string[];
    };
    domain?: string;
    ssl: boolean;
    cdn: boolean;
  };
  security: {
    encryption: boolean;
    iam: boolean;
    vpc: boolean;
    waf: boolean;
  };
  cost: {
    estimatedMonthlyCost: number;
    currency: string;
    optimization: boolean;
  };
  // Additional properties for deployment URLs
  lambdaFunctionUrl?: string;
  loadBalancerUrl?: string;
  s3BucketName?: string;
  cloudfrontUrl?: string;
}

export interface AppGenerationContext {
  userPrompt: string;
  targetCustomers?: string;
  projectId: string;
  infrastructureContext: InfrastructureContext;
  umlDiagrams?: any;
  generatedCode?: any;
  deploymentUrl?: string;
}

export interface GenerationResult {
  success: boolean;
  projectPath: string;
  deploymentUrl?: string;
  errors: string[];
  warnings: string[];
  generatedFiles: Array<{ path: string; content: string }>;
} 