// src/utils/localDevelopmentServer.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

export interface LocalServerConfig {
  port: number;
  databaseUrl?: string;
  environment: 'development' | 'production';
  enableHotReload: boolean;
  enableDatabase: boolean;
  enableCors: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface LocalServerResult {
  success: boolean;
  url: string;
  process?: ChildProcess;
  errors: string[];
  logs: string[];
  pid?: number;
}

export class LocalDevelopmentServer {
  private static readonly DEFAULT_CONFIG: LocalServerConfig = {
    port: 3001,
    environment: 'development',
    enableHotReload: true,
    enableDatabase: true,
    enableCors: true,
    logLevel: 'info'
  };

  /**
   * Create local development configuration for a generated project
   */
  static async createLocalConfig(
    projectDir: string,
    config: Partial<LocalServerConfig> = {}
  ): Promise<LocalServerConfig> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Generate random port if not specified
    if (!config.port) {
      finalConfig.port = 3000 + Math.floor(Math.random() * 1000);
    }

    // Create local environment files
    await this.createEnvironmentFiles(projectDir, finalConfig);
    
    // Create local development scripts
    await this.createLocalScripts(projectDir, finalConfig);
    
    // Create local database configuration
    if (finalConfig.enableDatabase) {
      await this.createLocalDatabaseConfig(projectDir, finalConfig);
    }

    return finalConfig;
  }

  /**
   * Start local development server
   */
  static async startLocalServer(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<LocalServerResult> {
    const result: LocalServerResult = {
      success: false,
      url: `http://localhost:${config.port}`,
      errors: [],
      logs: []
    };

    try {
      console.log(`[LocalDev] Starting local server for project: ${projectDir}`);
      console.log(`[LocalDev] Port: ${config.port}, Environment: ${config.environment}`);

      // Check if project has necessary files
      const hasPackageJson = await fs.pathExists(path.join(projectDir, 'package.json'));
      const hasSrcIndex = await fs.pathExists(path.join(projectDir, 'src', 'index.ts'));
      const hasDistIndex = await fs.pathExists(path.join(projectDir, 'dist', 'index.js'));

      if (!hasPackageJson) {
        throw new Error('No package.json found in project directory');
      }

      // Install dependencies if node_modules doesn't exist
      const hasNodeModules = await fs.pathExists(path.join(projectDir, 'node_modules'));
      if (!hasNodeModules) {
        console.log('[LocalDev] Installing dependencies...');
        await this.runCommand('npm', ['install'], projectDir);
      }

      // Build project if needed
      if (!hasDistIndex && hasSrcIndex) {
        console.log('[LocalDev] Building project...');
        await this.runCommand('npm', ['run', 'build'], projectDir);
      }

      // Start the server
      const process = await this.startServerProcess(projectDir, config);
      
      if (process) {
        result.success = true;
        result.process = process;
        result.pid = process.pid;
        result.logs.push(`Server started successfully on ${result.url}`);
        
        console.log(`[LocalDev] ✅ Server running on ${result.url}`);
        console.log(`[LocalDev] Process ID: ${process.pid}`);
      }

    } catch (error: any) {
      result.errors.push(error.message);
      console.error(`[LocalDev] ❌ Failed to start server: ${error.message}`);
    }

    return result;
  }

  /**
   * Stop local development server
   */
  static async stopLocalServer(process: ChildProcess): Promise<void> {
    if (process && !process.killed) {
      console.log(`[LocalDev] Stopping server process ${process.pid}...`);
      process.kill('SIGTERM');
      
      // Wait a bit, then force kill if still running
      setTimeout(() => {
        if (!process.killed) {
          console.log(`[LocalDev] Force killing process ${process.pid}...`);
          process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  /**
   * Create environment files for local development
   */
  private static async createEnvironmentFiles(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<void> {
    const envContent = `# Local Development Environment
NODE_ENV=${config.environment}
PORT=${config.port}
LOG_LEVEL=${config.logLevel}

# Database Configuration
${config.enableDatabase ? `
# Local SQLite database (fallback)
DATABASE_URL=sqlite:./local-dev.db
DATABASE_TYPE=sqlite

# PostgreSQL (if available)
# DATABASE_URL=postgresql://localhost:5432/local_dev
# DATABASE_TYPE=postgresql

# MySQL (if available)
# DATABASE_URL=mysql://localhost:3306/local_dev
# DATABASE_TYPE=mysql
` : ''}

# AWS Services (local fallbacks)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local-dev-key
AWS_SECRET_ACCESS_KEY=local-dev-secret

# DynamoDB Local (if using DynamoDB)
DYNAMODB_TABLE_NAME=local_dev_table
DYNAMODB_ENDPOINT=http://localhost:8000

# S3 Local (if using S3)
S3_BUCKET_NAME=local-dev-bucket
S3_ENDPOINT=http://localhost:9000

# Redis Local (if using Redis)
REDIS_URL=redis://localhost:6379

# JWT Secret (for local development)
JWT_SECRET=local-dev-jwt-secret-key-${uuidv4()}

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# API Configuration
API_BASE_URL=http://localhost:${config.port}
API_VERSION=v1

# Development Features
ENABLE_HOT_RELOAD=${config.enableHotReload}
ENABLE_CORS=${config.enableCors}
ENABLE_LOGGING=true
ENABLE_METRICS=true
`;

    await fs.writeFile(path.join(projectDir, '.env.local'), envContent);
    console.log(`[LocalDev] Created .env.local for local development`);
  }

  /**
   * Create local development scripts
   */
  private static async createLocalScripts(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<void> {
    const packageJsonPath = path.join(projectDir, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Add local development scripts
      packageJson.scripts = {
        ...packageJson.scripts,
        'dev:local': `ts-node-dev --respawn --transpile-only src/index.ts`,
        'start:local': `node dist/index.js`,
        'serverless:local': `node local-server.js`,
        'build:local': 'tsc',
        'test:local': 'jest',
        'lint:local': 'eslint src --ext .ts'
      };

      // Add dependencies for local server wrapper if they don't exist
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      
      // Add required dependencies for local server wrapper
      const requiredDeps = {
        'express': '^4.18.0',
        'cors': '^2.8.5',
        'helmet': '^7.0.0'
      };

      Object.entries(requiredDeps).forEach(([dep, version]) => {
        if (!packageJson.dependencies[dep]) {
          packageJson.dependencies[dep] = version;
        }
      });

      // Add dev dependencies for TypeScript support
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      const requiredDevDeps = {
        'ts-node': '^10.9.0',
        'ts-node-dev': '^2.0.0'
      };

      Object.entries(requiredDevDeps).forEach(([dep, version]) => {
        if (!packageJson.devDependencies[dep]) {
          packageJson.devDependencies[dep] = version;
        }
      });

      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      console.log(`[LocalDev] Updated package.json with local development scripts and dependencies`);
    }
  }

  /**
   * Create local database configuration
   */
  private static async createLocalDatabaseConfig(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<void> {
    const dbConfigPath = path.join(projectDir, 'src', 'config', 'database.ts');
    
    const dbConfigContent = `// Local Database Configuration
import { Sequelize } from 'sequelize';
import * as path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const isLocal = process.env.NODE_ENV !== 'production';

export const databaseConfig = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../local-dev.db'),
    logging: isDevelopment ? console.log : false,
    define: {
      timestamps: true,
      underscored: true
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

export const sequelize = new Sequelize(
  isLocal ? databaseConfig.development : databaseConfig.production
);

export default sequelize;
`;

    await fs.ensureDir(path.dirname(dbConfigPath));
    await fs.writeFile(dbConfigPath, dbConfigContent);
    console.log(`[LocalDev] Created local database configuration`);
  }

  /**
   * Start server process
   */
  private static async startServerProcess(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<ChildProcess | null> {
    const hasDistIndex = await fs.pathExists(path.join(projectDir, 'dist', 'index.js'));
    const hasSrcIndex = await fs.pathExists(path.join(projectDir, 'src', 'index.ts'));
    const hasServerlessHandler = await this.hasServerlessHandler(projectDir);

    let serverProcess: ChildProcess | null = null;

    if (hasServerlessHandler) {
      // Create local server wrapper for serverless applications
      console.log('[LocalDev] Creating local server wrapper for serverless app...');
      await this.createLocalServerWrapper(projectDir, config);
      
      serverProcess = spawn('node', ['local-server.js'], {
        cwd: projectDir,
        stdio: 'pipe',
        detached: false,
        env: { 
          ...process.env, 
          NODE_ENV: config.environment,
          PORT: config.port.toString()
        }
      });
    } else if (hasDistIndex) {
      // Use built version
      console.log('[LocalDev] Starting built server...');
      serverProcess = spawn('node', ['dist/index.js'], {
        cwd: projectDir,
        stdio: 'pipe',
        detached: false,
        env: { 
          ...process.env, 
          NODE_ENV: config.environment,
          PORT: config.port.toString()
        }
      });
    } else if (hasSrcIndex) {
      // Use development version with ts-node
      console.log('[LocalDev] Starting development server with ts-node...');
      serverProcess = spawn('npm', ['run', 'dev:local'], {
        cwd: projectDir,
        stdio: 'pipe',
        detached: false,
        env: { 
          ...process.env, 
          NODE_ENV: config.environment,
          PORT: config.port.toString()
        }
      });
    } else {
      throw new Error('No index file found (neither dist/index.js nor src/index.ts)');
    }

    // Handle process events
    if (serverProcess) {
      serverProcess.stdout?.on('data', (data) => {
        const log = data.toString().trim();
        console.log(`[LocalDev] ${log}`);
      });

      serverProcess.stderr?.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[LocalDev] Error: ${error}`);
      });

      serverProcess.on('error', (error) => {
        console.error(`[LocalDev] Process error: ${error.message}`);
      });

      serverProcess.on('exit', (code) => {
        console.log(`[LocalDev] Process exited with code ${code}`);
      });
    }

    return serverProcess;
  }

  /**
   * Check if the project has a serverless handler
   */
  private static async hasServerlessHandler(projectDir: string): Promise<boolean> {
    const srcIndexPath = path.join(projectDir, 'src', 'index.ts');
    const distIndexPath = path.join(projectDir, 'dist', 'index.js');
    
    try {
      // Check source file first
      if (await fs.pathExists(srcIndexPath)) {
        const content = await fs.readFile(srcIndexPath, 'utf8');
        return content.includes('serverless-http') || content.includes('export const handler');
      }
      
      // Check built file
      if (await fs.pathExists(distIndexPath)) {
        const content = await fs.readFile(distIndexPath, 'utf8');
        return content.includes('serverless-http') || content.includes('exports.handler');
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a local server wrapper for serverless applications
   */
  private static async createLocalServerWrapper(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<void> {
    const wrapperPath = path.join(projectDir, 'local-server.js');
    
    const wrapperContent = `#!/usr/bin/env node

/**
 * Local Development Server Wrapper for Serverless Applications
 * 
 * This file creates a local Express server that runs the serverless app
 * directly without the serverless-http wrapper for local development.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import the Express app directly (modified for local development)
let app;
try {
  // For local development, we'll use the local version
  const localIndexPath = path.join(__dirname, 'local-index.ts');
  if (require('fs').existsSync(localIndexPath)) {
    // For TypeScript, we'll use ts-node
    require('ts-node/register');
    const localModule = require('./local-index.ts');
    app = localModule.app;
    console.log('[LocalServer] Using local Express app from local-index.ts');
  } else {
    // Fallback to compiled version
    const localIndexJsPath = path.join(__dirname, 'local-index.js');
    if (require('fs').existsSync(localIndexJsPath)) {
      const localModule = require('./local-index.js');
      app = localModule.app;
      console.log('[LocalServer] Using local Express app from local-index.js');
    } else {
      console.error('[LocalServer] Local index file not found. Please run the local setup first.');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('[LocalServer] Error importing local Express app:', error.message);
  process.exit(1);
}

if (!app) {
  console.error('[LocalServer] No Express app found in local module');
  process.exit(1);
}

const PORT = process.env.PORT || ${config.port};

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    type: 'serverless-local'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 Local serverless server running on http://localhost:\${PORT}\`);
  console.log(\`📊 Environment: \${process.env.NODE_ENV || 'development'}\`);
  console.log(\`🔧 Type: Express App Direct\`);
  console.log(\`🏥 Health check: http://localhost:\${PORT}/health\`);
  console.log(\`📝 Logs will appear below...\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[LocalServer] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[LocalServer] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
`;

    await fs.writeFile(wrapperPath, wrapperContent);
    console.log(`[LocalDev] Created local server wrapper for serverless app`);
    
    // Create local index file that exports the Express app directly
    await this.createLocalIndexFile(projectDir);
  }

  /**
   * Create a local index file that exports the Express app directly
   */
  private static async createLocalIndexFile(projectDir: string): Promise<void> {
    const srcIndexPath = path.join(projectDir, 'src', 'index.ts');
    const localIndexPath = path.join(projectDir, 'local-index.ts');
    
    if (await fs.pathExists(srcIndexPath)) {
      let content = await fs.readFile(srcIndexPath, 'utf8');
      
      // Remove serverless-http import and wrapper
      content = content.replace(/import serverless from ['"]serverless-http['"];?\n?/g, '');
      content = content.replace(/export const handler = serverless\(app\);?\n?/g, '');
      
      // Add export for the Express app
      content += '\n// Export for local development\nexport { app };\n';
      
      await fs.writeFile(localIndexPath, content);
      console.log(`[LocalDev] Created local-index.ts for direct Express app usage`);
    }
  }

  /**
   * Run command in project directory
   */
  private static async runCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        detached: false
      });

      process.stdout?.on('data', (data) => {
        console.log(`[LocalDev] ${data.toString().trim()}`);
      });

      process.stderr?.on('data', (data) => {
        console.error(`[LocalDev] Error: ${data.toString().trim()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Create serverless.yml with local development support
   */
  static async createServerlessWithLocalSupport(
    projectDir: string,
    config: LocalServerConfig
  ): Promise<void> {
    const serverlessPath = path.join(projectDir, 'serverless.yml');
    
    const serverlessContent = `service: ${path.basename(projectDir)}-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: \${env:NODE_ENV, 'development'}
    PORT: \${env:PORT, '3001'}
    DATABASE_URL: \${env:DATABASE_URL}
    JWT_SECRET: \${env:JWT_SECRET}
    DYNAMODB_TABLE_NAME: \${env:DYNAMODB_TABLE_NAME}
    AWS_REGION: \${env:AWS_REGION}

functions:
  app:
    handler: dist/index.handler
    events:
      - http:
          path: /{proxy+}
          method: any
          cors: true

plugins:
  - serverless-offline
  - serverless-dotenv-plugin

custom:
  serverless-offline:
    httpPort: ${config.port}
    lambdaPort: ${config.port + 1}
    noPrependStageInUrl: true
    useChildProcesses: true
    allowCache: true
    reloadHandler: ${config.enableHotReload}
  dotenv:
    basePath: ./
    path: .env.local

resources:
  Resources:
    NotesTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: \${env:DYNAMODB_TABLE_NAME, 'local-dev-table'}
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
`;

    await fs.writeFile(serverlessPath, serverlessContent);
    console.log(`[LocalDev] Created serverless.yml with local development support`);
  }

  /**
   * Test local server health
   */
  static async testLocalServer(url: string, timeout: number = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);

      const testUrl = `${url}/health`;
      
      // Simple HTTP request to test server
      const http = require('http');
      const req = http.get(testUrl, (res: any) => {
        clearTimeout(timeoutId);
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        clearTimeout(timeoutId);
        resolve(false);
      });

      req.setTimeout(timeout, () => {
        clearTimeout(timeoutId);
        req.destroy();
        resolve(false);
      });
    });
  }
} 