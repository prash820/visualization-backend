/**
 * Phase 4: Infrastructure Integration
 * 
 * This module handles the integration of AWS infrastructure details into code generation.
 * It ensures that generated code is properly configured for deployment on AWS services
 * including Lambda, API Gateway, S3, RDS, DynamoDB, and other AWS resources.
 */

import { InfrastructureContext } from '../types/infrastructure';

export interface InfrastructureIntegrationResult {
  success: boolean;
  integratedCode: string;
  infrastructureConfig: InfrastructureConfig;
  deploymentConfig: DeploymentConfig;
  environmentVariables: EnvironmentVariables;
  error?: string;
}

export interface InfrastructureConfig {
  lambda: {
    handler: string;
    runtime: string;
    timeout: number;
    memorySize: number;
    environment: Record<string, string>;
    layers?: string[];
  };
  apiGateway: {
    type: 'rest' | 'http';
    cors: boolean;
    authorizer?: string;
    rateLimit?: number;
  };
  database: {
    type: 'postgresql' | 'mysql' | 'mongodb' | 'dynamodb';
    connectionString: string;
    poolSize?: number;
    ssl?: boolean;
  };
  storage: {
    s3?: {
      bucketName: string;
      region: string;
      cors?: boolean;
    };
    dynamodb?: {
      tableName: string;
      region: string;
    };
  };
  cache: {
    redis?: {
      endpoint: string;
      port: number;
      ssl?: boolean;
    };
  };
  auth: {
    cognito?: {
      userPoolId: string;
      clientId: string;
      region: string;
    };
  };
}

export interface DeploymentConfig {
  serverless: {
    service: string;
    provider: {
      name: 'aws';
      runtime: string;
      region: string;
      environment: Record<string, string>;
    };
    functions: Record<string, {
      handler: string;
      events: Array<{
        http: {
          path: string;
          method: string;
          cors?: boolean;
        };
      }>;
    }>;
  };
  docker?: {
    baseImage: string;
    ports: number[];
    environment: string[];
  };
}

export interface EnvironmentVariables {
  database: Record<string, string>;
  aws: Record<string, string>;
  application: Record<string, string>;
  security: Record<string, string>;
}

/**
 * Integrate infrastructure context into generated code
 */
export async function integrateInfrastructureIntoCode(
  codeContent: string,
  filePath: string,
  infrastructureContext: InfrastructureContext,
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'config'
): Promise<InfrastructureIntegrationResult> {
  try {
    console.log(`[InfrastructureIntegration] Integrating infrastructure into ${filePath} (${componentType})`);
    
    // Generate infrastructure configuration
    const infrastructureConfig = generateInfrastructureConfig(infrastructureContext);
    
    // Generate deployment configuration
    const deploymentConfig = generateDeploymentConfig(infrastructureContext);
    
    // Generate environment variables
    const environmentVariables = generateEnvironmentVariables(infrastructureContext);
    
    // Integrate infrastructure into the code content
    const integratedCode = await injectInfrastructureIntoCode(
      codeContent,
      filePath,
      componentType,
      infrastructureConfig,
      environmentVariables
    );
    
    return {
      success: true,
      integratedCode,
      infrastructureConfig,
      deploymentConfig,
      environmentVariables
    };
    
  } catch (error: any) {
    console.error(`[InfrastructureIntegration] Error integrating infrastructure: ${error.message}`);
    return {
      success: false,
      integratedCode: codeContent,
      infrastructureConfig: {} as InfrastructureConfig,
      deploymentConfig: {} as DeploymentConfig,
      environmentVariables: {} as EnvironmentVariables,
      error: error.message
    };
  }
}

/**
 * Generate infrastructure configuration from context
 */
function generateInfrastructureConfig(infrastructureContext: InfrastructureContext): InfrastructureConfig {
  return {
    lambda: {
      handler: 'index.handler',
      runtime: 'nodejs18.x',
      timeout: 30,
      memorySize: 128,
      environment: {
        NODE_ENV: 'production',
        ...infrastructureContext.lambdaFunctions?.main?.environment
      },
      layers: []
    },
    apiGateway: {
      type: infrastructureContext.apiGatewayUrl?.includes('execute-api') ? 'rest' : 'http',
      cors: true,
      rateLimit: 1000
    },
    database: {
      type: infrastructureContext.databaseType || 'postgresql',
      connectionString: infrastructureContext.databaseUrl || 'process.env.DATABASE_URL',
      poolSize: 10,
      ssl: true
    },
    storage: {
      s3: infrastructureContext.s3BucketName ? {
        bucketName: infrastructureContext.s3BucketName,
        region: infrastructureContext.s3BucketRegion || 'us-east-1',
        cors: true
      } : undefined,
      dynamodb: infrastructureContext.dynamoDbTableName ? {
        tableName: infrastructureContext.dynamoDbTableName,
        region: 'us-east-1'
      } : undefined
    },
    cache: {
      redis: infrastructureContext.redisEndpoint ? {
        endpoint: infrastructureContext.redisEndpoint,
        port: parseInt(infrastructureContext.redisPort || '6379'),
        ssl: true
      } : undefined
    },
    auth: {
      cognito: infrastructureContext.cognitoUserPoolId ? {
        userPoolId: infrastructureContext.cognitoUserPoolId,
        clientId: infrastructureContext.cognitoClientId || '',
        region: infrastructureContext.cognitoRegion || 'us-east-1'
      } : undefined
    }
  };
}

/**
 * Generate deployment configuration
 */
function generateDeploymentConfig(infrastructureContext: InfrastructureContext): DeploymentConfig {
  return {
    serverless: {
      service: 'app-backend',
      provider: {
        name: 'aws',
        runtime: 'nodejs18.x',
        region: 'us-east-1',
        environment: {
          NODE_ENV: 'production',
          DATABASE_URL: infrastructureContext.databaseUrl || 'process.env.DATABASE_URL',
          API_GATEWAY_URL: infrastructureContext.apiGatewayUrl || 'process.env.API_GATEWAY_URL',
          S3_BUCKET_NAME: infrastructureContext.s3BucketName || 'process.env.S3_BUCKET_NAME',
          DYNAMODB_TABLE_NAME: infrastructureContext.dynamoDbTableName || 'process.env.DYNAMODB_TABLE_NAME',
          REDIS_ENDPOINT: infrastructureContext.redisEndpoint || 'process.env.REDIS_ENDPOINT',
          COGNITO_USER_POOL_ID: infrastructureContext.cognitoUserPoolId || 'process.env.COGNITO_USER_POOL_ID',
          COGNITO_CLIENT_ID: infrastructureContext.cognitoClientId || 'process.env.COGNITO_CLIENT_ID'
        }
      },
      functions: {
        main: {
          handler: 'index.handler',
          events: [
            {
              http: {
                path: '/{proxy+}',
                method: 'ANY',
                cors: true
              }
            }
          ]
        }
      }
    }
  };
}

/**
 * Generate environment variables configuration
 */
function generateEnvironmentVariables(infrastructureContext: InfrastructureContext): EnvironmentVariables {
  return {
    database: {
      DATABASE_URL: infrastructureContext.databaseUrl || 'process.env.DATABASE_URL',
      DATABASE_NAME: infrastructureContext.databaseName || 'process.env.DATABASE_NAME',
      DATABASE_USERNAME: infrastructureContext.databaseUsername || 'process.env.DATABASE_USERNAME',
      DATABASE_PASSWORD: infrastructureContext.databasePassword || 'process.env.DATABASE_PASSWORD',
      DATABASE_PORT: infrastructureContext.databasePort || 'process.env.DATABASE_PORT',
      DATABASE_TYPE: infrastructureContext.databaseType || 'process.env.DATABASE_TYPE'
    },
    aws: {
      AWS_REGION: 'us-east-1',
      API_GATEWAY_URL: infrastructureContext.apiGatewayUrl || 'process.env.API_GATEWAY_URL',
      API_GATEWAY_ID: infrastructureContext.apiGatewayId || 'process.env.API_GATEWAY_ID',
      API_GATEWAY_STAGE: infrastructureContext.apiGatewayStage || 'process.env.API_GATEWAY_STAGE',
      LAMBDA_FUNCTION_URL: infrastructureContext.lambdaFunctionUrl || 'process.env.LAMBDA_FUNCTION_URL',
      S3_BUCKET_NAME: infrastructureContext.s3BucketName || 'process.env.S3_BUCKET_NAME',
      S3_BUCKET_REGION: infrastructureContext.s3BucketRegion || 'process.env.S3_BUCKET_REGION',
      DYNAMODB_TABLE_NAME: infrastructureContext.dynamoDbTableName || 'process.env.DYNAMODB_TABLE_NAME',
      DYNAMODB_TABLE_ARN: infrastructureContext.dynamoDbTableArn || 'process.env.DYNAMODB_TABLE_ARN',
      REDIS_ENDPOINT: infrastructureContext.redisEndpoint || 'process.env.REDIS_ENDPOINT',
      REDIS_PORT: infrastructureContext.redisPort || 'process.env.REDIS_PORT',
      LOAD_BALANCER_URL: infrastructureContext.loadBalancerUrl || 'process.env.LOAD_BALANCER_URL',
      CLOUDFRONT_URL: infrastructureContext.cloudfrontUrl || 'process.env.CLOUDFRONT_URL',
      VPC_ID: infrastructureContext.vpcId || 'process.env.VPC_ID'
    },
    application: {
      NODE_ENV: 'production',
      PORT: '3000',
      LOG_LEVEL: 'info',
      CORS_ORIGIN: '*',
      RATE_LIMIT_WINDOW: '900000',
      RATE_LIMIT_MAX: '100'
    },
    security: {
      JWT_SECRET: 'process.env.JWT_SECRET',
      COGNITO_USER_POOL_ID: infrastructureContext.cognitoUserPoolId || 'process.env.COGNITO_USER_POOL_ID',
      COGNITO_CLIENT_ID: infrastructureContext.cognitoClientId || 'process.env.COGNITO_CLIENT_ID',
      COGNITO_REGION: infrastructureContext.cognitoRegion || 'process.env.COGNITO_REGION'
    }
  };
}

/**
 * Inject infrastructure details into code content
 */
async function injectInfrastructureIntoCode(
  codeContent: string,
  filePath: string,
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'config',
  infrastructureConfig: InfrastructureConfig,
  environmentVariables: EnvironmentVariables
): Promise<string> {
  let integratedCode = codeContent;
  
  // Add infrastructure-specific imports
  integratedCode = addInfrastructureImports(integratedCode, componentType, infrastructureConfig);
  
  // Add environment variable configuration
  integratedCode = addEnvironmentConfiguration(integratedCode, environmentVariables);
  
  // Add AWS service configurations
  integratedCode = addAWSServiceConfigurations(integratedCode, componentType, infrastructureConfig);
  
  // Add Lambda-specific configurations
  integratedCode = addLambdaConfigurations(integratedCode, componentType, infrastructureConfig);
  
  // Add database configurations
  integratedCode = addDatabaseConfigurations(integratedCode, componentType, infrastructureConfig);
  
  // Add storage configurations
  integratedCode = addStorageConfigurations(integratedCode, componentType, infrastructureConfig);
  
  // Add authentication configurations
  integratedCode = addAuthenticationConfigurations(integratedCode, componentType, infrastructureConfig);
  
  return integratedCode;
}

/**
 * Add infrastructure-specific imports
 */
function addInfrastructureImports(
  codeContent: string,
  componentType: string,
  infrastructureConfig: InfrastructureConfig
): string {
  const imports: string[] = [];
  
  // Add AWS SDK imports based on infrastructure
  if (infrastructureConfig.storage.s3) {
    imports.push("import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';");
  }
  
  if (infrastructureConfig.storage.dynamodb) {
    imports.push("import { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';");
  }
  
  if (infrastructureConfig.database.type === 'dynamodb') {
    imports.push("import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';");
  }
  
  if (infrastructureConfig.auth.cognito) {
    imports.push("import { CognitoJwtVerifier } from 'aws-jwt-verify';");
  }
  
  if (infrastructureConfig.cache.redis) {
    imports.push("import Redis from 'ioredis';");
  }
  
  // Add serverless-http for Lambda integration
  if (componentType === 'controller') {
    imports.push("import serverless from 'serverless-http';");
  }
  
  // Insert imports at the top of the file
  if (imports.length > 0) {
    const importSection = imports.join('\n');
    const importRegex = /^(import\s+.*\s+from\s+['"][^'"]+['"];?\s*)+/m;
    
    if (importRegex.test(codeContent)) {
      // Add to existing imports
      return codeContent.replace(importRegex, (match) => `${match}\n${importSection}`);
    } else {
      // Add at the beginning
      return `${importSection}\n\n${codeContent}`;
    }
  }
  
  return codeContent;
}

/**
 * Add environment variable configuration
 */
function addEnvironmentConfiguration(
  codeContent: string,
  environmentVariables: EnvironmentVariables
): string {
  const envConfig = `
// Environment Configuration
const config = {
  database: {
    url: process.env.DATABASE_URL || '${environmentVariables.database.DATABASE_URL}',
    name: process.env.DATABASE_NAME || '${environmentVariables.database.DATABASE_NAME}',
    username: process.env.DATABASE_USERNAME || '${environmentVariables.database.DATABASE_USERNAME}',
    password: process.env.DATABASE_PASSWORD || '${environmentVariables.database.DATABASE_PASSWORD}',
    port: process.env.DATABASE_PORT || '${environmentVariables.database.DATABASE_PORT}',
    type: process.env.DATABASE_TYPE || '${environmentVariables.database.DATABASE_TYPE}'
  },
  aws: {
    region: process.env.AWS_REGION || '${environmentVariables.aws.AWS_REGION}',
    apiGatewayUrl: process.env.API_GATEWAY_URL || '${environmentVariables.aws.API_GATEWAY_URL}',
    s3BucketName: process.env.S3_BUCKET_NAME || '${environmentVariables.aws.S3_BUCKET_NAME}',
    dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME || '${environmentVariables.aws.DYNAMODB_TABLE_NAME}',
    redisEndpoint: process.env.REDIS_ENDPOINT || '${environmentVariables.aws.REDIS_ENDPOINT}'
  },
  application: {
    nodeEnv: process.env.NODE_ENV || '${environmentVariables.application.NODE_ENV}',
    port: process.env.PORT || '${environmentVariables.application.PORT}',
    logLevel: process.env.LOG_LEVEL || '${environmentVariables.application.LOG_LEVEL}'
  }
};
`;

  // Insert config after imports
  const importRegex = /^(import\s+.*\s+from\s+['"][^'"]+['"];?\s*)+/m;
  if (importRegex.test(codeContent)) {
    return codeContent.replace(importRegex, (match) => `${match}\n${envConfig}`);
  } else {
    return `${envConfig}\n\n${codeContent}`;
  }
}

/**
 * Add AWS service configurations
 */
function addAWSServiceConfigurations(
  codeContent: string,
  componentType: string,
  infrastructureConfig: InfrastructureConfig
): string {
  let awsConfig = '';
  
  // Add S3 client configuration
  if (infrastructureConfig.storage.s3) {
    awsConfig += `
// S3 Client Configuration
const s3Client = new S3Client({
  region: '${infrastructureConfig.storage.s3.region}'
});
`;
  }
  
  // Add DynamoDB client configuration
  if (infrastructureConfig.storage.dynamodb) {
    awsConfig += `
// DynamoDB Client Configuration
const dynamoClient = new DynamoDBClient({
  region: '${infrastructureConfig.storage.dynamodb.region}'
});
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);
`;
  }
  
  // Add Redis client configuration
  if (infrastructureConfig.cache.redis) {
    awsConfig += `
// Redis Client Configuration
const redisClient = new Redis('${infrastructureConfig.cache.redis.endpoint}:${infrastructureConfig.cache.redis.port}', {
  ssl: ${infrastructureConfig.cache.redis.ssl}
});
`;
  }
  
  // Add Cognito configuration
  if (infrastructureConfig.auth.cognito) {
    awsConfig += `
// Cognito JWT Verifier Configuration
const cognitoVerifier = CognitoJwtVerifier.create({
  userPoolId: '${infrastructureConfig.auth.cognito.userPoolId}',
  tokenUse: 'access',
  clientId: '${infrastructureConfig.auth.cognito.clientId}'
});
`;
  }
  
  if (awsConfig) {
    // Insert after config section
    const configRegex = /const config = \{[\s\S]*?\};/;
    if (configRegex.test(codeContent)) {
      return codeContent.replace(configRegex, (match) => `${match}\n${awsConfig}`);
    } else {
      // Insert after imports
      const importRegex = /^(import\s+.*\s+from\s+['"][^'"]+['"];?\s*)+/m;
      if (importRegex.test(codeContent)) {
        return codeContent.replace(importRegex, (match) => `${match}\n${awsConfig}`);
      } else {
        return `${awsConfig}\n\n${codeContent}`;
      }
    }
  }
  
  return codeContent;
}

/**
 * Add Lambda-specific configurations
 */
function addLambdaConfigurations(
  codeContent: string,
  componentType: string,
  infrastructureConfig: InfrastructureConfig
): string {
  if (componentType === 'controller') {
    const lambdaConfig = `
// Lambda Handler Configuration
export const handler = serverless(app, {
  request: {
    // Lambda-specific request configuration
  },
  response: {
    // Lambda-specific response configuration
  }
});
`;
    
    // Add Lambda handler export
    return codeContent + lambdaConfig;
  }
  
  return codeContent;
}

/**
 * Add database configurations
 */
function addDatabaseConfigurations(
  codeContent: string,
  componentType: string,
  infrastructureConfig: InfrastructureConfig
): string {
  if (componentType === 'repository' || componentType === 'service') {
    let dbConfig = '';
    
    if (infrastructureConfig.database.type === 'dynamodb') {
      dbConfig = `
// DynamoDB Configuration
const tableName = process.env.DYNAMODB_TABLE_NAME || '${infrastructureConfig.storage.dynamodb?.tableName || 'app-table'}';
`;
    } else if (infrastructureConfig.database.type === 'postgresql' || infrastructureConfig.database.type === 'mysql') {
      dbConfig = `
// Database Configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '${infrastructureConfig.database.connectionString}'),
  database: process.env.DATABASE_NAME || '${infrastructureConfig.database.connectionString}',
  user: process.env.DATABASE_USERNAME || '${infrastructureConfig.database.connectionString}',
  password: process.env.DATABASE_PASSWORD || '${infrastructureConfig.database.connectionString}',
  ssl: ${infrastructureConfig.database.ssl},
  pool: {
    min: 2,
    max: ${infrastructureConfig.database.poolSize || 10}
  }
};
`;
    }
    
    if (dbConfig) {
      // Insert after AWS configurations
      const awsConfigRegex = /(const s3Client|const dynamoClient|const redisClient|const cognitoVerifier)/;
      if (awsConfigRegex.test(codeContent)) {
        return codeContent.replace(awsConfigRegex, (match) => `${dbConfig}\n${match}`);
      } else {
        // Insert after config section
        const configRegex = /const config = \{[\s\S]*?\};/;
        if (configRegex.test(codeContent)) {
          return codeContent.replace(configRegex, (match) => `${match}\n${dbConfig}`);
        } else {
          return `${dbConfig}\n\n${codeContent}`;
        }
      }
    }
  }
  
  return codeContent;
}

/**
 * Add storage configurations
 */
function addStorageConfigurations(
  codeContent: string,
  componentType: string,
  infrastructureConfig: InfrastructureConfig
): string {
  if (componentType === 'repository' || componentType === 'service') {
    let storageConfig = '';
    
    if (infrastructureConfig.storage.s3) {
      storageConfig += `
// S3 Storage Configuration
const s3BucketName = process.env.S3_BUCKET_NAME || '${infrastructureConfig.storage.s3.bucketName}';
`;
    }
    
    if (storageConfig) {
      // Insert after database configurations
      const dbConfigRegex = /(const tableName|const dbConfig)/;
      if (dbConfigRegex.test(codeContent)) {
        return codeContent.replace(dbConfigRegex, (match) => `${match}\n${storageConfig}`);
      } else {
        // Insert after AWS configurations
        const awsConfigRegex = /(const s3Client|const dynamoClient|const redisClient|const cognitoVerifier)/;
        if (awsConfigRegex.test(codeContent)) {
          return codeContent.replace(awsConfigRegex, (match) => `${match}\n${storageConfig}`);
        } else {
          return `${storageConfig}\n\n${codeContent}`;
        }
      }
    }
  }
  
  return codeContent;
}

/**
 * Add authentication configurations
 */
function addAuthenticationConfigurations(
  codeContent: string,
  componentType: string,
  infrastructureConfig: InfrastructureConfig
): string {
  if (componentType === 'controller' || componentType === 'service') {
    let authConfig = '';
    
    if (infrastructureConfig.auth.cognito) {
      authConfig = `
// Authentication Middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const payload = await cognitoVerifier.verify(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
`;
    }
    
    if (authConfig) {
      // Insert before class/function definitions
      const classRegex = /(class|function|export)/;
      if (classRegex.test(codeContent)) {
        return codeContent.replace(classRegex, (match) => `${authConfig}\n${match}`);
      } else {
        return `${authConfig}\n\n${codeContent}`;
      }
    }
  }
  
  return codeContent;
}

/**
 * Generate infrastructure-aware code templates
 */
export function generateInfrastructureTemplates(
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'config',
  infrastructureConfig: InfrastructureConfig
): string {
  switch (componentType) {
    case 'entity':
      return generateEntityTemplate(infrastructureConfig);
    case 'service':
      return generateServiceTemplate(infrastructureConfig);
    case 'controller':
      return generateControllerTemplate(infrastructureConfig);
    case 'repository':
      return generateRepositoryTemplate(infrastructureConfig);
    case 'config':
      return generateConfigTemplate(infrastructureConfig);
    default:
      return '';
  }
}

function generateEntityTemplate(infrastructureConfig: InfrastructureConfig): string {
  return `
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class ExampleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: string;

  @UpdateDateColumn()
  updatedAt: string;
}
`;
}

function generateServiceTemplate(infrastructureConfig: InfrastructureConfig): string {
  return `
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExampleService {
  constructor(
    private readonly exampleRepository: ExampleRepository
  ) {}

  async create(data: CreateExampleDto): Promise<ExampleEntity> {
    return this.exampleRepository.create(data);
  }

  async findById(id: string): Promise<ExampleEntity | null> {
    return this.exampleRepository.findById(id);
  }

  async update(id: string, data: UpdateExampleDto): Promise<ExampleEntity> {
    return this.exampleRepository.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.exampleRepository.delete(id);
  }
}
`;
}

function generateControllerTemplate(infrastructureConfig: InfrastructureConfig): string {
  return `
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ExampleService } from './example.service';
import { CreateExampleDto, UpdateExampleDto } from './dto';

@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  async create(@Body() data: CreateExampleDto) {
    return this.exampleService.create(data);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.exampleService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateExampleDto) {
    return this.exampleService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.exampleService.delete(id);
  }
}
`;
}

function generateRepositoryTemplate(infrastructureConfig: InfrastructureConfig): string {
  if (infrastructureConfig.database.type === 'dynamodb') {
    return `
import { Injectable } from '@nestjs/common';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class ExampleRepository {
  constructor(private readonly dynamoClient: DynamoDBDocumentClient) {}

  async create(data: CreateExampleDto): Promise<ExampleEntity> {
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: item
    }));

    return item;
  }

  async findById(id: string): Promise<ExampleEntity | null> {
    const result = await this.dynamoClient.send(new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id }
    }));

    return result.Item as ExampleEntity || null;
  }

  async update(id: string, data: UpdateExampleDto): Promise<ExampleEntity> {
    const updateExpression = 'SET ' + Object.keys(data).map(key => \`#\${key} = :\${key}\`).join(', ');
    const expressionAttributeNames = Object.keys(data).reduce((acc, key) => ({ ...acc, [\`#\${key}\`]: key }), {});
    const expressionAttributeValues = Object.keys(data).reduce((acc, key) => ({ ...acc, [\`:\${key}\`]: data[key] }), {});

    await this.dynamoClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.dynamoClient.send(new DeleteCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { id }
    }));
  }
}
`;
  } else {
    return `
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExampleEntity } from './example.entity';

@Injectable()
export class ExampleRepository {
  constructor(
    @InjectRepository(ExampleEntity)
    private readonly repository: Repository<ExampleEntity>
  ) {}

  async create(data: CreateExampleDto): Promise<ExampleEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<ExampleEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async update(id: string, data: UpdateExampleDto): Promise<ExampleEntity> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
`;
  }
}

function generateConfigTemplate(infrastructureConfig: InfrastructureConfig): string {
  return `
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';
import { ExampleRepository } from './example.repository';
import { ExampleEntity } from './example.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExampleEntity]),
    TypeOrmModule.forRoot({
      type: '${infrastructureConfig.database.type}',
      url: process.env.DATABASE_URL,
      entities: [ExampleEntity],
      synchronize: process.env.NODE_ENV !== 'production'
    })
  ],
  controllers: [ExampleController],
  providers: [ExampleService, ExampleRepository],
  exports: [ExampleService]
})
export class ExampleModule {}
`;
} 