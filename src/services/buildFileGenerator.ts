import fs from 'fs/promises';
import path from 'path';

export interface BuildFileConfig {
  projectName: string;
  projectType: 'fullstack' | 'frontend' | 'backend';
  framework: 'react' | 'vue' | 'angular' | 'express' | 'fastify';
  language: 'typescript' | 'javascript';
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

export interface ServiceIntegration {
  serviceName: string;
  dependencies: string[];
  imports: string[];
  integrationCode: string;
}

export class BuildFileGenerator {
  /**
   * Analyze generated code and create build files
   */
  async generateBuildFiles(projectPath: string, jobId: string): Promise<{
    success: boolean;
    generatedFiles: string[];
    dependencies: string[];
    errors: string[];
  }> {
    const generatedFiles: string[] = [];
    const errors: string[] = [];
    const dependencies: string[] = [];

    try {
      console.log(`[BuildFileGenerator] Job ${jobId}: Analyzing project structure...`);
      
      // Analyze the project structure
      const analysis = await this.analyzeProjectStructure(projectPath);
      
      // Generate package.json for backend
      if (analysis.hasBackend) {
        const backendPackageJson = await this.generateBackendPackageJson(analysis, jobId);
        const backendPath = path.join(projectPath, 'backend');
        await fs.mkdir(backendPath, { recursive: true });
        await fs.writeFile(path.join(backendPath, 'package.json'), JSON.stringify(backendPackageJson, null, 2));
        generatedFiles.push('backend/package.json');
        dependencies.push(...Object.keys(backendPackageJson.dependencies), ...Object.keys(backendPackageJson.devDependencies));
      }

      // Generate package.json for frontend
      if (analysis.hasFrontend) {
        const frontendPackageJson = await this.generateFrontendPackageJson(analysis, jobId);
        const frontendPath = path.join(projectPath, 'frontend');
        await fs.mkdir(frontendPath, { recursive: true });
        await fs.writeFile(path.join(frontendPath, 'package.json'), JSON.stringify(frontendPackageJson, null, 2));
        generatedFiles.push('frontend/package.json');
        dependencies.push(...Object.keys(frontendPackageJson.dependencies), ...Object.keys(frontendPackageJson.devDependencies));
      }

      // Generate TypeScript configurations
      if (analysis.hasBackend) {
        const backendTsConfig = this.generateBackendTsConfig();
        await fs.writeFile(path.join(projectPath, 'backend', 'tsconfig.json'), JSON.stringify(backendTsConfig, null, 2));
        generatedFiles.push('backend/tsconfig.json');
      }

      if (analysis.hasFrontend) {
        const frontendTsConfig = this.generateFrontendTsConfig();
        await fs.writeFile(path.join(projectPath, 'frontend', 'tsconfig.json'), JSON.stringify(frontendTsConfig, null, 2));
        generatedFiles.push('frontend/tsconfig.json');
      }

      // Generate ESLint configurations
      if (analysis.hasBackend) {
        const backendEslintConfig = this.generateBackendEslintConfig();
        await fs.writeFile(path.join(projectPath, 'backend', '.eslintrc.js'), backendEslintConfig);
        generatedFiles.push('backend/.eslintrc.js');
      }

      if (analysis.hasFrontend) {
        const frontendEslintConfig = this.generateFrontendEslintConfig();
        await fs.writeFile(path.join(projectPath, 'frontend', '.eslintrc.js'), frontendEslintConfig);
        generatedFiles.push('frontend/.eslintrc.js');
      }

      // Generate Vite configuration for frontend
      if (analysis.hasFrontend) {
        const viteConfig = this.generateViteConfig();
        await fs.writeFile(path.join(projectPath, 'frontend', 'vite.config.ts'), viteConfig);
        generatedFiles.push('frontend/vite.config.ts');
      }

      // Ensure entry point files exist
      const entryPointResult = await this.ensureEntryPoints(projectPath, analysis, jobId);
      generatedFiles.push(...entryPointResult.generatedFiles);

      // Generate missing service files and integration code
      const integrationResult = await this.generateServiceIntegrations(projectPath, analysis, jobId);
      generatedFiles.push(...integrationResult.generatedFiles);
      dependencies.push(...integrationResult.dependencies);

      console.log(`[BuildFileGenerator] Job ${jobId}: Generated ${generatedFiles.length} build files`);

      return {
        success: true,
        generatedFiles,
        dependencies: [...new Set(dependencies)], // Remove duplicates
        errors
      };

    } catch (error: any) {
      console.error(`[BuildFileGenerator] Job ${jobId}: Error generating build files:`, error);
      errors.push(error.message);
      return {
        success: false,
        generatedFiles,
        dependencies,
        errors
      };
    }
  }

  /**
   * Analyze the project structure to understand what's been generated
   */
  private async analyzeProjectStructure(projectPath: string): Promise<{
    hasBackend: boolean;
    hasFrontend: boolean;
    backendServices: string[];
    backendModels: string[];
    backendControllers: string[];
    frontendComponents: string[];
    dependencies: string[];
    imports: string[];
  }> {
    const analysis = {
      hasBackend: false,
      hasFrontend: false,
      backendServices: [] as string[],
      backendModels: [] as string[],
      backendControllers: [] as string[],
      frontendComponents: [] as string[],
      dependencies: [] as string[],
      imports: [] as string[]
    };

    try {
      // Check for backend structure
      const backendPath = path.join(projectPath, 'backend');
      const backendExists = await fs.access(backendPath).then(() => true).catch(() => false);
      
      if (backendExists) {
        analysis.hasBackend = true;
        
        // Scan backend files
        await this.scanDirectory(backendPath, 'src', (filePath, content) => {
          if (filePath.includes('/services/')) {
            analysis.backendServices.push(path.basename(filePath, '.ts'));
          }
          if (filePath.includes('/models/')) {
            analysis.backendModels.push(path.basename(filePath, '.ts'));
          }
          if (filePath.includes('/controllers/')) {
            analysis.backendControllers.push(path.basename(filePath, '.ts'));
          }
          
          // Extract imports and dependencies
          this.extractImportsAndDependencies(content, analysis);
        });
      }

      // Check for frontend structure
      const frontendPath = path.join(projectPath, 'frontend');
      const frontendExists = await fs.access(frontendPath).then(() => true).catch(() => false);
      
      if (frontendExists) {
        analysis.hasFrontend = true;
        
        // Scan frontend files
        await this.scanDirectory(frontendPath, 'src', (filePath, content) => {
          if (filePath.includes('/components/')) {
            analysis.frontendComponents.push(path.basename(filePath, '.tsx'));
          }
          
          // Extract imports and dependencies
          this.extractImportsAndDependencies(content, analysis);
        });
      }

    } catch (error) {
      console.error('Error analyzing project structure:', error);
    }

    return analysis;
  }

  /**
   * Recursively scan directory for files
   */
  private async scanDirectory(dirPath: string, relativePath: string, callback: (filePath: string, content: string) => void): Promise<void> {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await this.scanDirectory(fullPath, path.join(relativePath, item), callback);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) {
          const content = await fs.readFile(fullPath, 'utf-8');
          callback(path.join(relativePath, item), content);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  /**
   * Extract imports and dependencies from file content
   */
  private extractImportsAndDependencies(content: string, analysis: any): void {
    // Extract import statements
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip relative imports
      if (!importPath.startsWith('.')) {
        analysis.imports.push(importPath);
        
        // Map common imports to package names
        const packageMap: Record<string, string> = {
          'react': 'react',
          'express': 'express',
          'mongoose': 'mongoose',
          'aws-sdk': 'aws-sdk',
          'redis': 'redis',
          'cors': 'cors',
          'helmet': 'helmet',
          'dotenv': 'dotenv',
          'bcrypt': 'bcrypt',
          'jsonwebtoken': 'jsonwebtoken',
          'joi': 'joi',
          'winston': 'winston',
          'axios': 'axios',
          'lodash': 'lodash',
          'moment': 'moment',
          'uuid': 'uuid'
        };
        
        const packageName = packageMap[importPath.split('/')[0]];
        if (packageName && !analysis.dependencies.includes(packageName)) {
          analysis.dependencies.push(packageName);
        }
      }
    }
  }

  /**
   * Generate backend package.json
   */
  private async generateBackendPackageJson(analysis: any, jobId: string): Promise<any> {
    const baseDependencies = [
      'express',
      'cors',
      'helmet',
      'dotenv'
    ];

    const baseDevDependencies = [
      '@types/express',
      '@types/cors',
      '@types/node',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'eslint',
      'typescript',
      'ts-node',
      'nodemon'
    ];

    // Add detected dependencies
    const dependencies = [...baseDependencies, ...analysis.dependencies.filter((dep: string) => 
      !baseDependencies.includes(dep) && !baseDevDependencies.includes(dep)
    )];

    // Add type definitions for detected dependencies
    const devDependencies = [...baseDevDependencies];
    analysis.dependencies.forEach((dep: string) => {
      const typePackage = `@types/${dep}`;
      if (!devDependencies.includes(typePackage) && !devDependencies.includes(dep)) {
        devDependencies.push(typePackage);
      }
    });

    return {
      name: "backend",
      version: "1.0.0",
      description: "Backend API server",
      main: "dist/index.js",
      scripts: {
        "build": "tsc",
        "start": "node dist/index.js",
        "dev": "nodemon src/index.ts",
        "test": "jest",
        "lint": "eslint src/**/*.ts",
        "type-check": "tsc --noEmit"
      },
      dependencies: dependencies.reduce((acc: any, dep: string) => {
        acc[dep] = "^5.0.0"; // Use latest major version
        return acc;
      }, {}),
      devDependencies: devDependencies.reduce((acc: any, dep: string) => {
        acc[dep] = "^5.0.0"; // Use latest major version
        return acc;
      }, {}),
      engines: {
        node: ">=16.0.0"
      }
    };
  }

  /**
   * Generate frontend package.json
   */
  private async generateFrontendPackageJson(analysis: any, jobId: string): Promise<any> {
    const baseDependencies = [
      'react',
      'react-dom',
      'react-router-dom'
    ];

    const baseDevDependencies = [
      '@types/react',
      '@types/react-dom',
      '@types/node',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'eslint',
      'typescript',
      'vite',
      '@vitejs/plugin-react'
    ];

    // Add detected dependencies
    const dependencies = [...baseDependencies, ...analysis.dependencies.filter((dep: string) => 
      !baseDependencies.includes(dep) && !baseDevDependencies.includes(dep)
    )];

    return {
      name: "frontend",
      version: "1.0.0",
      description: "Frontend React application",
      type: "module",
      scripts: {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "lint": "eslint src/**/*.{ts,tsx}",
        "type-check": "tsc --noEmit"
      },
      dependencies: dependencies.reduce((acc: any, dep: string) => {
        acc[dep] = "^5.0.0";
        return acc;
      }, {}),
      devDependencies: baseDevDependencies.reduce((acc: any, dep: string) => {
        acc[dep] = "^5.0.0";
        return acc;
      }, {}),
      engines: {
        node: ">=16.0.0"
      }
    };
  }

  /**
   * Generate backend TypeScript configuration
   */
  private generateBackendTsConfig(): any {
    return {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
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
        noUnusedLocals: false, // Allow unused locals for development
        noUnusedParameters: false, // Allow unused parameters for development
        exactOptionalPropertyTypes: true,
        noImplicitOverride: true,
        noPropertyAccessFromIndexSignature: true,
        noUncheckedIndexedAccess: true
      },
      include: [
        "src/**/*"
      ],
      exclude: [
        "node_modules",
        "dist",
        "**/*.test.ts",
        "**/*.spec.ts"
      ]
    };
  }

  /**
   * Generate frontend TypeScript configuration
   */
  private generateFrontendTsConfig(): any {
    return {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noFallthroughCasesInSwitch: true
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    };
  }

  /**
   * Generate backend ESLint configuration
   */
  private generateBackendEslintConfig(): string {
    return `module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
  },
  env: {
    node: true,
    es6: true,
  },
};`;
  }

  /**
   * Generate frontend ESLint configuration
   */
  private generateFrontendEslintConfig(): string {
    return `module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};`;
  }

  /**
   * Generate Vite configuration for frontend
   */
  private generateViteConfig(): string {
    return `/**
 * Vite Configuration
 * Customize the Vite build process for the frontend application.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables";',
      },
    },
  },
});`;
  }

  /**
   * Ensure entry point files exist for frontend and backend
   */
  private async ensureEntryPoints(projectPath: string, analysis: any, jobId: string): Promise<{ generatedFiles: string[] }> {
    const generatedFiles: string[] = [];

    // Ensure frontend entry points
    if (analysis.hasFrontend) {
      const frontendPath = path.join(projectPath, 'frontend', 'src');
      await fs.mkdir(frontendPath, { recursive: true });

      // Ensure index.tsx exists (React entry point)
      const indexTsxPath = path.join(frontendPath, 'index.tsx');
      if (!(await fs.access(indexTsxPath).then(() => true).catch(() => false))) {
        const indexTsxContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
        await fs.writeFile(indexTsxPath, indexTsxContent);
        generatedFiles.push('frontend/src/index.tsx');
      }

      // Ensure public/index.html exists
      const publicPath = path.join(projectPath, 'frontend', 'public');
      await fs.mkdir(publicPath, { recursive: true });
      
      const indexHtmlPath = path.join(publicPath, 'index.html');
      if (!(await fs.access(indexHtmlPath).then(() => true).catch(() => false))) {
        const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="Web site created using create-react-app"
    />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;
        await fs.writeFile(indexHtmlPath, indexHtmlContent);
        generatedFiles.push('frontend/public/index.html');
      }
    }

    // Ensure backend entry points
    if (analysis.hasBackend) {
      const backendPath = path.join(projectPath, 'backend', 'src');
      await fs.mkdir(backendPath, { recursive: true });

      // Ensure index.ts exists (Node.js entry point)
      const indexTsPath = path.join(backendPath, 'index.ts');
      if (!(await fs.access(indexTsPath).then(() => true).catch(() => false))) {
        const indexTsContent = `import app from './server';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
  console.log(\`📊 Environment: \${process.env.NODE_ENV || 'development'}\`);
  console.log(\`🔗 Health check: http://localhost:\${PORT}/api/health\`);
});

export default app;`;
        await fs.writeFile(indexTsPath, indexTsContent);
        generatedFiles.push('backend/src/index.ts');
      }
    }

    return { generatedFiles };
  }

  /**
   * Generate missing service files and integration code
   */
  private async generateServiceIntegrations(projectPath: string, analysis: any, jobId: string): Promise<{
    generatedFiles: string[];
    dependencies: string[];
  }> {
    const generatedFiles: string[] = [];
    const dependencies: string[] = [];

    try {
      if (analysis.hasBackend) {
        const backendPath = path.join(projectPath, 'backend', 'src');
        
        // Generate missing service files
        const missingServices = this.detectMissingServices(analysis);
        
        for (const service of missingServices) {
          const serviceContent = this.generateServiceFile(service);
          const servicePath = path.join(backendPath, 'services', `${service.name}.ts`);
          await fs.mkdir(path.dirname(servicePath), { recursive: true });
          await fs.writeFile(servicePath, serviceContent);
          generatedFiles.push(`backend/src/services/${service.name}.ts`);
          dependencies.push(...service.dependencies);
        }

        // Generate integration code
        const integrationContent = this.generateIntegrationCode(analysis);
        const integrationPath = path.join(backendPath, 'utils', 'integration.ts');
        await fs.mkdir(path.dirname(integrationPath), { recursive: true });
        await fs.writeFile(integrationPath, integrationContent);
        generatedFiles.push('backend/src/utils/integration.ts');

        // Generate validation utilities
        const validationContent = this.generateValidationUtilities();
        const validationPath = path.join(backendPath, 'utils', 'validation.ts');
        await fs.writeFile(validationPath, validationContent);
        generatedFiles.push('backend/src/utils/validation.ts');
      }

    } catch (error) {
      console.error(`[BuildFileGenerator] Job ${jobId}: Error generating service integrations:`, error);
    }

    return { generatedFiles, dependencies };
  }

  /**
   * Detect missing services based on imports
   */
  private detectMissingServices(analysis: any): Array<{ name: string; dependencies: string[] }> {
    const missingServices: Array<{ name: string; dependencies: string[] }> = [];
    
    // Check for common missing services
    const servicePatterns = [
      { pattern: /RedisService/, name: 'RedisService', deps: ['redis'] },
      { pattern: /CloudWatchService/, name: 'CloudWatchService', deps: ['aws-sdk'] },
      { pattern: /DatabaseService/, name: 'DatabaseService', deps: ['mongoose'] },
      { pattern: /AuthService/, name: 'AuthService', deps: ['bcrypt', 'jsonwebtoken'] },
      { pattern: /ValidationService/, name: 'ValidationService', deps: ['joi'] },
      { pattern: /LoggerService/, name: 'LoggerService', deps: ['winston'] }
    ];

    const allContent = analysis.imports.join(' ');
    
    servicePatterns.forEach(({ pattern, name, deps }) => {
      if (pattern.test(allContent) && !analysis.backendServices.includes(name)) {
        missingServices.push({ name, dependencies: deps });
      }
    });

    return missingServices;
  }

  /**
   * Generate a service file
   */
  private generateServiceFile(service: { name: string; dependencies: string[] }): string {
    const serviceTemplates: Record<string, string> = {
      RedisService: `import Redis from 'redis';

export class RedisService {
  private client: Redis.RedisClientType;

  constructor() {
    this.client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}`,

      CloudWatchService: `import { CloudWatch } from 'aws-sdk';

export class CloudWatchService {
  private cloudwatch: CloudWatch;

  constructor() {
    this.cloudwatch = new CloudWatch({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async putMetricData(namespace: string, metricName: string, value: number, unit: string = 'Count'): Promise<void> {
    const params = {
      Namespace: namespace,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date()
        }
      ]
    };

    await this.cloudwatch.putMetricData(params).promise();
  }

  async logError(error: Error, context?: Record<string, any>): Promise<void> {
    console.error('CloudWatch Error Log:', { error: error.message, stack: error.stack, context });
    // In a real implementation, you would send this to CloudWatch Logs
  }
}`,

      DatabaseService: `import mongoose from 'mongoose';

export class DatabaseService {
  private connection: mongoose.Connection | null = null;

  async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/app';
      await mongoose.connect(mongoUri);
      this.connection = mongoose.connection;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      console.log('Disconnected from MongoDB');
    }
  }

  getConnection(): mongoose.Connection | null {
    return this.connection;
  }
}`,

      AuthService: `import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthService {
  private readonly jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  generateToken(payload: any): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}`,

      ValidationService: `import Joi from 'joi';

export class ValidationService {
  validateCalculationInput(expression: string): boolean {
    const schema = Joi.string().pattern(/^[0-9+\-*/().\\s]+$/).required();
    const result = schema.validate(expression);
    return !result.error;
  }

  validateUserInput(data: any): { valid: boolean; errors?: string[] } {
    const schema = Joi.object({
      username: Joi.string().min(3).max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    });

    const result = schema.validate(data);
    
    if (result.error) {
      return {
        valid: false,
        errors: result.error.details.map(detail => detail.message)
      };
    }

    return { valid: true };
  }
}`,

      LoggerService: `import winston from 'winston';

export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'calculator-service' },
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}`
    };

    return serviceTemplates[service.name] || `export class ${service.name} {
  constructor() {
    // TODO: Implement ${service.name}
  }
}`;
  }

  /**
   * Generate integration code to connect services
   */
  private generateIntegrationCode(analysis: any): string {
    return `/**
 * Service Integration Module
 * Connects all services and provides a unified interface
 */

import { RedisService } from '../services/RedisService';
import { CloudWatchService } from '../services/CloudWatchService';
import { DatabaseService } from '../services/DatabaseService';
import { AuthService } from '../services/AuthService';
import { ValidationService } from '../services/ValidationService';
import { LoggerService } from '../services/LoggerService';

export class ServiceIntegration {
  private redisService: RedisService;
  private cloudWatchService: CloudWatchService;
  private databaseService: DatabaseService;
  private authService: AuthService;
  private validationService: ValidationService;
  private loggerService: LoggerService;

  constructor() {
    this.redisService = new RedisService();
    this.cloudWatchService = new CloudWatchService();
    this.databaseService = new DatabaseService();
    this.authService = new AuthService();
    this.validationService = new ValidationService();
    this.loggerService = new LoggerService();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize all services
      await this.redisService.connect();
      await this.databaseService.connect();
      
      this.loggerService.info('All services initialized successfully');
    } catch (error) {
      this.loggerService.error('Failed to initialize services', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.redisService.disconnect();
      await this.databaseService.disconnect();
      
      this.loggerService.info('All services shut down successfully');
    } catch (error) {
      this.loggerService.error('Error during shutdown', { error });
    }
  }

  // Service getters
  getRedisService(): RedisService {
    return this.redisService;
  }

  getCloudWatchService(): CloudWatchService {
    return this.cloudWatchService;
  }

  getDatabaseService(): DatabaseService {
    return this.databaseService;
  }

  getAuthService(): AuthService {
    return this.authService;
  }

  getValidationService(): ValidationService {
    return this.validationService;
  }

  getLoggerService(): LoggerService {
    return this.loggerService;
  }
}

// Export singleton instance
export const serviceIntegration = new ServiceIntegration();
`;
  }

  /**
   * Generate validation utilities
   */
  private generateValidationUtilities(): string {
    return `/**
 * Validation utilities for the application
 */

/**
 * Validates calculation input expression
 * @param expression - The mathematical expression to validate
 * @returns true if the expression is valid, false otherwise
 */
export function validateCalculationInput(expression: string): boolean {
  if (!expression || typeof expression !== 'string') {
    return false;
  }

  // Remove whitespace
  const cleanExpression = expression.replace(/\\s/g, '');
  
  if (cleanExpression.length === 0) {
    return false;
  }

  // Basic validation: check for allowed characters
  const allowedChars = /^[0-9+\\-*/().\\s]+$/;
  if (!allowedChars.test(cleanExpression)) {
    return false;
  }

  // Check for balanced parentheses
  let parenthesesCount = 0;
  for (const char of cleanExpression) {
    if (char === '(') {
      parenthesesCount++;
    } else if (char === ')') {
      parenthesesCount--;
      if (parenthesesCount < 0) {
        return false; // Unbalanced parentheses
      }
    }
  }

  if (parenthesesCount !== 0) {
    return false; // Unbalanced parentheses
  }

  // Check for consecutive operators
  const consecutiveOperators = /[+\\-*/]{2,}/;
  if (consecutiveOperators.test(cleanExpression)) {
    return false;
  }

  // Check for division by zero (basic check)
  if (cleanExpression.includes('/0') && !cleanExpression.includes('/0.')) {
    return false;
  }

  return true;
}

/**
 * Validates numeric input
 * @param value - The value to validate
 * @returns true if the value is a valid number, false otherwise
 */
export function validateNumericInput(value: any): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }
  
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }
  
  return false;
}

/**
 * Validates that a value is within a specified range
 * @param value - The value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns true if the value is within range, false otherwise
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validates email format
 * @param email - The email to validate
 * @returns true if the email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates required fields
 * @param data - The data object to validate
 * @param requiredFields - Array of required field names
 * @returns true if all required fields are present, false otherwise
 */
export function validateRequiredFields(data: any, requiredFields: string[]): boolean {
  return requiredFields.every(field => data[field] !== undefined && data[field] !== null && data[field] !== '');
}
`;
  }
}

export const buildFileGenerator = new BuildFileGenerator(); 