/**
 * Build File Generator
 * 
 * Generates all necessary build and deployment files for a complete project
 * including package.json, tsconfig.json, serverless.yml, Dockerfile, etc.
 */

import { InfrastructureContext } from '../types/infrastructure';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BuildFile {
  path: string;
  content: string;
  description: string;
}

export interface BuildFileGenerationResult {
  success: boolean;
  files: BuildFile[];
  error?: string;
}

/**
 * Generate all build files for a complete, deployable project
 */
export async function generateBuildFiles(
  projectPath: string,
  infrastructureContext: InfrastructureContext,
  projectName: string = 'app-backend'
): Promise<BuildFileGenerationResult> {
  try {
    console.log(`[BuildFileGenerator] Generating build files for project: ${projectName}`);
    
    const files: BuildFile[] = [];
    
    // 1. Package.json
    const packageJson = generatePackageJson(projectName, infrastructureContext);
    files.push({
      path: 'backend/package.json',
      content: packageJson,
      description: 'Node.js package configuration with dependencies and scripts'
    });
    
    // 2. TypeScript configuration
    const tsConfig = generateTsConfig();
    files.push({
      path: 'backend/tsconfig.json',
      content: tsConfig,
      description: 'TypeScript compiler configuration'
    });
    
    // 3. Serverless Framework configuration
    const serverlessYml = generateServerlessConfig(projectName, infrastructureContext);
    files.push({
      path: 'backend/serverless.yml',
      content: serverlessYml,
      description: 'Serverless Framework configuration for AWS Lambda deployment'
    });
    
    // 4. Environment variables template
    const envExample = generateEnvExample(infrastructureContext);
    files.push({
      path: 'backend/.env.example',
      content: envExample,
      description: 'Environment variables template'
    });
    
    // 5. Docker configuration
    const dockerfile = generateDockerfile();
    files.push({
      path: 'backend/Dockerfile',
      content: dockerfile,
      description: 'Docker container configuration'
    });
    
    // 6. Docker Compose for local development
    const dockerCompose = generateDockerCompose();
    files.push({
      path: 'backend/docker-compose.yml',
      content: dockerCompose,
      description: 'Docker Compose configuration for local development'
    });
    
    // 7. Git ignore file
    const gitignore = generateGitignore();
    files.push({
      path: 'backend/.gitignore',
      content: gitignore,
      description: 'Git ignore patterns'
    });
    
    // 8. ESLint configuration
    const eslintConfig = generateEslintConfig();
    files.push({
      path: 'backend/.eslintrc.js',
      content: eslintConfig,
      description: 'ESLint code linting configuration'
    });
    
    // 9. Jest testing configuration
    const jestConfig = generateJestConfig();
    files.push({
      path: 'backend/jest.config.js',
      content: jestConfig,
      description: 'Jest testing framework configuration'
    });
    
    // 10. Nodemon configuration for development
    const nodemonConfig = generateNodemonConfig();
    files.push({
      path: 'backend/nodemon.json',
      content: nodemonConfig,
      description: 'Nodemon development server configuration'
    });
    
    // 11. README with deployment instructions
    const readme = generateReadme(projectName, infrastructureContext);
    files.push({
      path: 'backend/README.md',
      content: readme,
      description: 'Project documentation and deployment instructions'
    });
    
    // 12. GitHub Actions workflow
    const githubActions = generateGitHubActions(projectName);
    files.push({
      path: 'backend/.github/workflows/deploy.yml',
      content: githubActions,
      description: 'GitHub Actions CI/CD workflow'
    });
    
    console.log(`[BuildFileGenerator] Generated ${files.length} build files successfully`);
    
    return {
      success: true,
      files
    };
    
  } catch (error: any) {
    console.error(`[BuildFileGenerator] Error generating build files: ${error.message}`);
    return {
      success: false,
      files: [],
      error: error.message
    };
  }
}

/**
 * Generate package.json with all necessary dependencies and scripts
 */
function generatePackageJson(projectName: string, infrastructureContext: InfrastructureContext): string {
  const dependencies = {
    // Core dependencies
    'express': '^4.18.2',
    'cors': '^2.8.5',
    'helmet': '^7.0.0',
    'morgan': '^1.10.0',
    'dotenv': '^16.3.1',
    'serverless-http': '^3.2.0',
    
    // Database dependencies
    'pg': '^8.11.3',
    'sequelize': '^6.35.0',
    'mongoose': '^8.0.0',
    '@aws-sdk/client-dynamodb': '^3.450.0',
    
    // Authentication
    'jsonwebtoken': '^9.0.2',
    'bcryptjs': '^2.4.3',
    '@aws-sdk/client-cognito-identity': '^3.450.0',
    
    // AWS SDK
    '@aws-sdk/client-s3': '^3.450.0',
    '@aws-sdk/client-lambda': '^3.450.0',
    '@aws-sdk/client-api-gateway': '^3.450.0',
    
    // Utilities
    'uuid': '^9.0.1',
    'joi': '^17.11.0',
    'winston': '^3.11.0'
  };
  
  const devDependencies = {
    // TypeScript
    'typescript': '^5.2.2',
    'ts-node': '^10.9.1',
    'ts-node-dev': '^2.0.0',
    '@types/node': '^20.8.0',
    
    // Express types
    '@types/express': '^4.17.20',
    '@types/cors': '^2.8.15',
    '@types/morgan': '^1.9.8',
    '@types/bcryptjs': '^2.4.5',
    '@types/jsonwebtoken': '^9.0.4',
    '@types/uuid': '^9.0.6',
    
    // AWS types
    '@types/aws-lambda': '^8.10.119',
    
    // Testing
    'jest': '^29.7.0',
    '@types/jest': '^29.5.6',
    'ts-jest': '^29.1.1',
    'supertest': '^6.3.3',
    '@types/supertest': '^2.0.15',
    
    // Linting
    'eslint': '^8.52.0',
    '@typescript-eslint/eslint-plugin': '^6.9.1',
    '@typescript-eslint/parser': '^6.9.1',
    
    // Development
    'nodemon': '^3.0.1',
    'serverless': '^3.38.0',
    'serverless-offline': '^13.3.0',
    'serverless-plugin-typescript': '^2.1.5'
  };
  
  const scripts = {
    'build': 'tsc',
    'start': 'node dist/index.js',
    'dev': 'ts-node-dev --respawn --transpile-only src/index.ts',
    'dev:local': 'nodemon src/index.ts',
    'test': 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    'lint': 'eslint src --ext .ts',
    'lint:fix': 'eslint src --ext .ts --fix',
    'type-check': 'tsc --noEmit',
    'deploy': 'serverless deploy',
    'deploy:dev': 'serverless deploy --stage dev',
    'deploy:prod': 'serverless deploy --stage prod',
    'remove': 'serverless remove',
    'logs': 'serverless logs -f main -t',
    'docker:build': 'docker build -t app-backend .',
    'docker:run': 'docker run -p 3000:3000 app-backend',
    'docker:compose': 'docker-compose up -d'
  };
  
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'Backend API generated with VisualizeAI',
    main: 'dist/index.js',
    scripts,
    dependencies,
    devDependencies,
    engines: {
      node: '>=18.0.0',
      npm: '>=8.0.0'
    },
    keywords: ['aws', 'lambda', 'serverless', 'typescript', 'express'],
    author: 'VisualizeAI',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'https://github.com/visualizeai/app-backend.git'
    }
  };
  
  return JSON.stringify(packageJson, null, 2);
}

/**
 * Generate TypeScript configuration
 */
function generateTsConfig(): string {
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      removeComments: false,
      noImplicitAny: true,
      noImplicitReturns: true,
      noImplicitThis: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      exactOptionalPropertyTypes: true,
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true,
      noUncheckedIndexedAccess: true,
      allowSyntheticDefaultImports: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true
    },
    include: [
      'src/**/*'
    ],
    exclude: [
      'node_modules',
      'dist',
      '**/*.test.ts',
      '**/*.spec.ts',
      'coverage'
    ],
    'ts-node': {
      require: ['tsconfig-paths/register']
    }
  };
  
  return JSON.stringify(tsConfig, null, 2);
}

/**
 * Generate Serverless Framework configuration
 */
function generateServerlessConfig(projectName: string, infrastructureContext: InfrastructureContext): string {
  const serverlessConfig = {
    service: projectName,
    frameworkVersion: '3',
    provider: {
      name: 'aws',
      runtime: 'nodejs18.x',
      region: 'us-east-1',
      stage: '${opt:stage, "dev"}',
      environment: {
        NODE_ENV: '${self:provider.stage}',
        DATABASE_URL: infrastructureContext.databaseUrl || '${env:DATABASE_URL}',
        API_GATEWAY_URL: infrastructureContext.apiGatewayUrl || '${env:API_GATEWAY_URL}',
        S3_BUCKET_NAME: infrastructureContext.s3BucketName || '${env:S3_BUCKET_NAME}',
        DYNAMODB_TABLE_NAME: infrastructureContext.dynamoDbTableName || '${env:DYNAMODB_TABLE_NAME}',
        REDIS_ENDPOINT: infrastructureContext.redisEndpoint || '${env:REDIS_ENDPOINT}',
        COGNITO_USER_POOL_ID: infrastructureContext.cognitoUserPoolId || '${env:COGNITO_USER_POOL_ID}',
        COGNITO_CLIENT_ID: infrastructureContext.cognitoClientId || '${env:COGNITO_CLIENT_ID}',
        AWS_REGION: '${self:provider.region}'
      },
      iam: {
        role: {
          statements: [
            {
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
              ],
              Resource: infrastructureContext.dynamoDbTableArn || 'arn:aws:dynamodb:${self:provider.region}:*:table/*'
            },
            {
              Effect: 'Allow',
              Action: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject'
              ],
              Resource: infrastructureContext.s3BucketName ? `arn:aws:s3:::${infrastructureContext.s3BucketName}/*` : 'arn:aws:s3:::*'
            },
            {
              Effect: 'Allow',
              Action: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminUpdateUserAttributes'
              ],
              Resource: infrastructureContext.cognitoUserPoolId ? `arn:aws:cognito-idp:${infrastructureContext.cognitoRegion || 'us-east-1'}:*:userpool/${infrastructureContext.cognitoUserPoolId}` : 'arn:aws:cognito-idp:*:*:userpool/*'
            }
          ]
        }
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
              cors: {
                origin: '*',
                headers: [
                  'Content-Type',
                  'X-Amz-Date',
                  'Authorization',
                  'X-Api-Key',
                  'X-Amz-Security-Token'
                ],
                allowCredentials: false
              }
            }
          }
        ],
        timeout: 30,
        memorySize: 256
      }
    },
    plugins: [
      'serverless-plugin-typescript',
      'serverless-offline'
    ],
    custom: {
      serverlessOffline: {
        httpPort: 3000,
        noPrependStageInUrl: true
      }
    }
  };
  
  return JSON.stringify(serverlessConfig, null, 2);
}

/**
 * Generate environment variables template
 */
function generateEnvExample(infrastructureContext: InfrastructureContext): string {
  return `# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=${infrastructureContext.databaseUrl || 'postgresql://username:password@localhost:5432/database'}
DATABASE_NAME=${infrastructureContext.databaseName || 'database'}
DATABASE_USERNAME=${infrastructureContext.databaseUsername || 'username'}
DATABASE_PASSWORD=${infrastructureContext.databasePassword || 'password'}
DATABASE_PORT=${infrastructureContext.databasePort || '5432'}
DATABASE_TYPE=${infrastructureContext.databaseType || 'postgresql'}

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# API Gateway
API_GATEWAY_URL=${infrastructureContext.apiGatewayUrl || 'https://api-gateway-url.amazonaws.com/prod'}
API_GATEWAY_ID=${infrastructureContext.apiGatewayId || 'api-gateway-id'}
API_GATEWAY_STAGE=${infrastructureContext.apiGatewayStage || 'prod'}

# Lambda
LAMBDA_FUNCTION_URL=${infrastructureContext.lambdaFunctionUrl || 'https://lambda-function-url.lambda-url.us-east-1.on.aws'}

# Storage
S3_BUCKET_NAME=${infrastructureContext.s3BucketName || 'your-s3-bucket-name'}
S3_BUCKET_REGION=${infrastructureContext.s3BucketRegion || 'us-east-1'}
DYNAMODB_TABLE_NAME=${infrastructureContext.dynamoDbTableName || 'your-dynamodb-table-name'}
DYNAMODB_TABLE_ARN=${infrastructureContext.dynamoDbTableArn || 'arn:aws:dynamodb:us-east-1:123456789012:table/your-table-name'}

# Cache
REDIS_ENDPOINT=${infrastructureContext.redisEndpoint || 'localhost:6379'}
REDIS_PORT=${infrastructureContext.redisPort || '6379'}
ELASTICACHE_ENDPOINT=${infrastructureContext.elasticacheEndpoint || 'localhost:6379'}

# Load Balancer
LOAD_BALANCER_URL=${infrastructureContext.loadBalancerUrl || 'http://load-balancer-url.us-east-1.elb.amazonaws.com'}
LOAD_BALANCER_ARN=${infrastructureContext.loadBalancerArn || 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/your-alb'}

# CDN
CLOUDFRONT_URL=${infrastructureContext.cloudfrontUrl || 'https://cloudfront-distribution.cloudfront.net'}
CLOUDFRONT_DISTRIBUTION_ID=${infrastructureContext.cloudfrontDistributionId || 'distribution-id'}

# Authentication
COGNITO_USER_POOL_ID=${infrastructureContext.cognitoUserPoolId || 'us-east-1_userpoolid'}
COGNITO_CLIENT_ID=${infrastructureContext.cognitoClientId || 'client-id'}
COGNITO_REGION=${infrastructureContext.cognitoRegion || 'us-east-1'}

# VPC
VPC_ID=${infrastructureContext.vpcId || 'vpc-12345678'}
SUBNET_IDS=${infrastructureContext.subnetIds?.join(',') || 'subnet-12345678,subnet-87654321'}
SECURITY_GROUP_IDS=${infrastructureContext.securityGroupIds?.join(',') || 'sg-12345678'}

# Security
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100`;
}

/**
 * Generate Dockerfile
 */
function generateDockerfile(): string {
  return `# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]`;
}

/**
 * Generate Docker Compose configuration
 */
function generateDockerCompose(): string {
  return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src
      - ./dist:/app/dist
    networks:
      - app-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: app_db
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge`;
}

/**
 * Generate .gitignore file
 */
function generateGitignore(): string {
  return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Terraform
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl

# AWS
.aws/

# Temporary files
tmp/
temp/`;
}

/**
 * Generate ESLint configuration
 */
function generateEslintConfig(): string {
  return `module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'warn',
  },
  env: {
    node: true,
    es6: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};`;
}

/**
 * Generate Jest configuration
 */
function generateJestConfig(): string {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
};`;
}

/**
 * Generate Nodemon configuration
 */
function generateNodemonConfig(): string {
  return `{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.test.ts", "src/**/*.spec.ts"],
  "exec": "ts-node-dev --respawn --transpile-only src/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}`;
}

/**
 * Generate README with deployment instructions
 */
function generateReadme(projectName: string, infrastructureContext: InfrastructureContext): string {
  return `# ${projectName}

A backend API generated with VisualizeAI, designed for deployment on AWS Lambda with Serverless Framework.

## 🚀 Features

- **Serverless Architecture**: Built for AWS Lambda deployment
- **TypeScript**: Full TypeScript support with strict type checking
- **Express.js**: Fast, unopinionated web framework
- **AWS Integration**: Native AWS service integration
- **Database Support**: PostgreSQL, MongoDB, and DynamoDB support
- **Authentication**: JWT and AWS Cognito integration
- **Testing**: Jest testing framework with coverage
- **Linting**: ESLint with TypeScript rules
- **Docker Support**: Containerized deployment option

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- AWS CLI configured
- Serverless Framework CLI

## 🛠️ Installation

\`\`\`bash
# Install dependencies
npm install

# Install Serverless Framework globally
npm install -g serverless
\`\`\`

## 🔧 Development

\`\`\`bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
\`\`\`

## 🐳 Docker Development

\`\`\`bash
# Build and run with Docker Compose
npm run docker:compose

# Or build and run individually
npm run docker:build
npm run docker:run
\`\`\`

## 🚀 Deployment

### Local Testing

\`\`\`bash
# Start serverless offline
npm run dev:local
\`\`\`

### AWS Deployment

\`\`\`bash
# Deploy to dev stage
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Remove deployment
npm run remove

# View logs
npm run logs
\`\`\`

## 📁 Project Structure

\`\`\`
src/
├── controllers/     # API controllers
├── services/        # Business logic
├── repositories/    # Data access layer
├── models/          # Data models
├── middleware/      # Express middleware
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── index.ts         # Main entry point
\`\`\`

## 🔐 Environment Variables

Copy \`.env.example\` to \`.env\` and configure your environment variables:

\`\`\`bash
cp .env.example .env
\`\`\`

### Required Variables

- \`DATABASE_URL\`: Database connection string
- \`JWT_SECRET\`: Secret key for JWT tokens
- \`AWS_REGION\`: AWS region for deployment

### AWS Configuration

- \`AWS_ACCESS_KEY_ID\`: AWS access key
- \`AWS_SECRET_ACCESS_KEY\`: AWS secret key
- \`S3_BUCKET_NAME\`: S3 bucket for file storage
- \`DYNAMODB_TABLE_NAME\`: DynamoDB table name
- \`COGNITO_USER_POOL_ID\`: Cognito user pool ID

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

## 📊 API Documentation

The API documentation is available at:

- **Development**: http://localhost:3000/api/docs
- **Production**: [Your API Gateway URL]/api/docs

## 🔍 Monitoring

- **CloudWatch Logs**: View logs in AWS CloudWatch
- **X-Ray Tracing**: Distributed tracing with AWS X-Ray
- **Health Check**: GET /health endpoint for monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the logs in CloudWatch

---

Generated with ❤️ by VisualizeAI`;
}

/**
 * Generate GitHub Actions workflow
 */
function generateGitHubActions(projectName: string): string {
  return `name: Deploy to AWS

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ env.NODE_VERSION }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  deploy-dev:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ env.NODE_VERSION }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Serverless Framework
      run: npm install -g serverless
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Deploy to dev
      run: npm run deploy:dev
      env:
        DATABASE_URL: \${{ secrets.DATABASE_URL_DEV }}
        JWT_SECRET: \${{ secrets.JWT_SECRET_DEV }}

  deploy-prod:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ env.NODE_VERSION }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Serverless Framework
      run: npm install -g serverless
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Deploy to production
      run: npm run deploy:prod
      env:
        DATABASE_URL: \${{ secrets.DATABASE_URL_PROD }}
        JWT_SECRET: \${{ secrets.JWT_SECRET_PROD }}`;
} 