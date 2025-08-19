/**
 * Infrastructure-related TypeScript interfaces and types
 */

export interface InfrastructureContext {
  // Database configurations
  databaseUrl?: string;
  databaseName?: string;
  databaseUsername?: string;
  databasePassword?: string;
  databasePort?: string;
  databaseType?: 'postgresql' | 'mysql' | 'mongodb' | 'dynamodb';
  
  // API Gateway configurations
  apiGatewayUrl?: string;
  apiGatewayId?: string;
  apiGatewayStage?: string;
  
  // Lambda function configurations (support for multiple functions)
  lambdaFunctions?: {
    [functionName: string]: {
      functionUrl?: string;
      functionArn?: string;
      functionName?: string;
      handler?: string;
      runtime?: string;
      timeout?: number;
      memorySize?: number;
      environment?: Record<string, string>;
    };
  };
  lambdaFunctionUrl?: string; // Legacy support
  
  // Storage configurations
  s3BucketName?: string;
  s3BucketRegion?: string;
  dynamoDbTableName?: string;
  dynamoDbTableArn?: string;
  
  // Cache configurations
  redisEndpoint?: string;
  redisPort?: string;
  elasticacheEndpoint?: string;
  
  // Load balancer configurations
  loadBalancerUrl?: string;
  loadBalancerArn?: string;
  
  // CDN configurations
  cloudfrontUrl?: string;
  cloudfrontDistributionId?: string;
  
  // Authentication configurations
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
  cognitoRegion?: string;
  
  // VPC configurations
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  
  // Other AWS resources
  [key: string]: any;
}

export interface CodeGenerationJob {
  id: string;
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
  logs: string[];
  currentStep: string;
} 