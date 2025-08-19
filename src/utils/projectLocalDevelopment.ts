// src/utils/projectLocalDevelopment.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';

export interface ProjectDeploymentConfig {
  projectId: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  enableHotReload: boolean;
  enableLogging: boolean;
  timeout: number;
}

export interface DeploymentResult {
  success: boolean;
  functionUrl?: string;
  apiGatewayUrl?: string;
  errors: string[];
  logs: string[];
  deploymentId: string;
}

export class ProjectLocalDevelopment {
  private static readonly TERRAFORM_RUNNER_URL = 'http://localhost:8000';
  private static readonly BACKEND_URL = 'http://localhost:5001';

  /**
   * Deploy a generated project to AWS Lambda for local testing
   */
  static async deployProjectForTesting(
    projectId: string,
    config: Partial<ProjectDeploymentConfig> = {}
  ): Promise<DeploymentResult> {
    const deploymentConfig: ProjectDeploymentConfig = {
      projectId,
      environment: 'development',
      region: 'us-east-1',
      enableHotReload: true,
      enableLogging: true,
      timeout: 30,
      ...config
    };

    const result: DeploymentResult = {
      success: false,
      errors: [],
      logs: [],
      deploymentId: `test-deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    try {
      console.log(`[ProjectDev] Starting deployment for project: ${projectId}`);
      console.log(`[ProjectDev] Deployment ID: ${result.deploymentId}`);

      // Step 1: Check if project exists
      const projectDir = path.join(process.cwd(), 'generated-projects', projectId);
      if (!await fs.pathExists(projectDir)) {
        throw new Error(`Project directory not found: ${projectDir}`);
      }

      // Step 2: Check if terraform state exists
      const terraformStatePath = path.join(process.cwd(), 'terraform-runner', 'workspace', projectId, 'terraform.tfstate');
      if (!await fs.pathExists(terraformStatePath)) {
        throw new Error(`Terraform state not found for project: ${projectId}. Please deploy infrastructure first.`);
      }

      // Step 3: Prepare project for deployment
      await this.prepareProjectForDeployment(projectDir, deploymentConfig);

      // Step 4: Deploy to AWS Lambda
      const deploymentResult = await this.deployToLambda(projectId, deploymentConfig);
      
      if (deploymentResult.success) {
        result.success = true;
        result.functionUrl = deploymentResult.functionUrl;
        result.apiGatewayUrl = deploymentResult.apiGatewayUrl;
        result.logs.push(`✅ Project deployed successfully to AWS Lambda`);
        result.logs.push(`🔗 Function URL: ${deploymentResult.functionUrl}`);
        result.logs.push(`🌐 API Gateway URL: ${deploymentResult.apiGatewayUrl}`);
      } else {
        result.errors.push(...deploymentResult.errors);
      }

    } catch (error: any) {
      result.errors.push(error.message);
      console.error(`[ProjectDev] Deployment failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Test a deployed project
   */
  static async testDeployedProject(
    projectId: string,
    functionUrl?: string
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      // Get function URL from terraform state if not provided
      if (!functionUrl) {
        const url = await this.getFunctionUrlFromTerraformState(projectId);
        if (!url) {
          throw new Error('Function URL not found. Please deploy the project first.');
        }
        functionUrl = url;
      }

      console.log(`[ProjectDev] Testing deployed project: ${projectId}`);
      console.log(`[ProjectDev] Function URL: ${functionUrl}`);

      // Test health endpoint
      const healthResponse = await axios.get(`${functionUrl}/health`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ProjectDev-Test/1.0'
        }
      });

      console.log(`[ProjectDev] Health check response:`, healthResponse.data);

      // Test API endpoints if they exist
      const apiTests = await this.runApiTests(functionUrl, projectId);

      return {
        success: true,
        response: {
          health: healthResponse.data,
          apiTests
        }
      };

    } catch (error: any) {
      console.error(`[ProjectDev] Test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get function URL from terraform state
   */
  private static async getFunctionUrlFromTerraformState(projectId: string): Promise<string | null> {
    try {
      const terraformStatePath = path.join(process.cwd(), 'terraform-runner', 'workspace', projectId, 'terraform.tfstate');
      
      if (!await fs.pathExists(terraformStatePath)) {
        return null;
      }

      const terraformState = await fs.readJson(terraformStatePath);
      
      // Look for Lambda function URL in outputs
      if (terraformState.outputs) {
        const functionUrlOutput = terraformState.outputs.function_url || terraformState.outputs.lambda_function_url;
        if (functionUrlOutput && functionUrlOutput.value) {
          return functionUrlOutput.value;
        }
      }

      // Look for API Gateway URL
      if (terraformState.outputs) {
        const apiGatewayOutput = terraformState.outputs.api_gateway_url || terraformState.outputs.gateway_url;
        if (apiGatewayOutput && apiGatewayOutput.value) {
          return apiGatewayOutput.value;
        }
      }

      return null;
    } catch (error) {
      console.error(`[ProjectDev] Error reading terraform state: ${error}`);
      return null;
    }
  }

  /**
   * Prepare project for deployment
   */
  private static async prepareProjectForDeployment(
    projectDir: string,
    config: ProjectDeploymentConfig
  ): Promise<void> {
    console.log(`[ProjectDev] Preparing project for deployment...`);

    const backendDir = path.join(projectDir, 'backend');
    if (!await fs.pathExists(backendDir)) {
      throw new Error('Backend directory not found in project');
    }

    // Ensure project is built
    const distPath = path.join(backendDir, 'dist');
    if (!await fs.pathExists(distPath)) {
      console.log(`[ProjectDev] Building project...`);
      await this.runCommand('npm', ['run', 'build'], backendDir);
    }

    // Create deployment package
    await this.createDeploymentPackage(backendDir, config);
  }

  /**
   * Create deployment package for Lambda
   */
  private static async createDeploymentPackage(
    backendDir: string,
    config: ProjectDeploymentConfig
  ): Promise<void> {
    console.log(`[ProjectDev] Creating deployment package...`);

    const packagePath = path.join(backendDir, 'deployment-package');
    await fs.ensureDir(packagePath);

    // Copy dist files and flatten them to root level for Lambda compatibility
    const distPath = path.join(backendDir, 'dist');
    if (await fs.pathExists(distPath)) {
      console.log(`[ProjectDev] Flattening dist files to root level for Lambda compatibility...`);
      
      // Read all files in dist directory
      const distFiles = await this.getAllFiles(distPath);
      
      for (const filePath of distFiles) {
        const relativePath = path.relative(distPath, filePath);
        const fileName = path.basename(filePath);
        
        // Copy file to root level of deployment package
        const targetPath = path.join(packagePath, fileName);
        await fs.copy(filePath, targetPath);
        
        console.log(`[ProjectDev] Flattened: ${relativePath} -> ${fileName}`);
      }
    }

    // Copy package.json
    const packageJsonPath = path.join(backendDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      await fs.copy(packageJsonPath, path.join(packagePath, 'package.json'));
    }

    // Install production dependencies (safer than copying node_modules)
    const packageJson = await fs.readJson(packageJsonPath);
    if (packageJson.dependencies) {
      console.log(`[ProjectDev] Installing production dependencies...`);
      await this.runCommand('npm', ['install', '--production'], packagePath);
    }

    // Create deployment config
    const deploymentConfig = {
      projectId: config.projectId,
      environment: config.environment,
      region: config.region,
      enableLogging: config.enableLogging,
      timeout: config.timeout,
      deploymentTime: new Date().toISOString()
    };

    await fs.writeJson(path.join(packagePath, 'deployment-config.json'), deploymentConfig, { spaces: 2 });

    console.log(`[ProjectDev] Deployment package created at: ${packagePath}`);
  }

  /**
   * Get all files in a directory recursively
   */
  private static async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Deploy to AWS Lambda using terraform-runner
   */
  private static async deployToLambda(
    projectId: string,
    config: ProjectDeploymentConfig
  ): Promise<{ success: boolean; functionUrl?: string; apiGatewayUrl?: string; errors: string[] }> {
    const result: { success: boolean; functionUrl?: string; apiGatewayUrl?: string; errors: string[] } = { 
      success: false, 
      errors: [] 
    };

    try {
      console.log(`[ProjectDev] Deploying to AWS Lambda via terraform-runner...`);

      // Use the existing terraform-runner to deploy the application
      const deployResponse = await axios.post(`${this.TERRAFORM_RUNNER_URL}/deploy`, {
        projectId: projectId,
        userId: 'project-dev', // Add a default user ID
        environment: config.environment,
        deployment_config: {
          enable_logging: config.enableLogging,
          timeout: config.timeout,
          memory_size: 512
        }
      }, {
        timeout: 120000 // 2 minutes timeout
      });

      if (deployResponse.data.success) {
        result.success = true;
        result.functionUrl = deployResponse.data.function_url;
        result.apiGatewayUrl = deployResponse.data.api_gateway_url;
        console.log(`[ProjectDev] ✅ Deployment successful`);
        console.log(`[ProjectDev] 🔗 Function URL: ${result.functionUrl}`);
        console.log(`[ProjectDev] 🌐 API Gateway URL: ${result.apiGatewayUrl}`);
      } else {
        result.errors.push(deployResponse.data.error || 'Deployment failed');
      }

    } catch (error: any) {
      result.errors.push(`Deployment error: ${error.message}`);
      console.error(`[ProjectDev] Deployment error:`, error.response?.data || error.message);
    }

    return result;
  }

  /**
   * Run API tests against deployed function
   */
  private static async runApiTests(functionUrl: string, projectId: string): Promise<any> {
    const tests = [];

    try {
      // Test 1: Health endpoint
      try {
        const healthTest = await axios.get(`${functionUrl}/health`);
        tests.push({
          name: 'Health Check',
          success: true,
          status: healthTest.status,
          data: healthTest.data
        });
      } catch (error: any) {
        tests.push({
          name: 'Health Check',
          success: false,
          error: error.message
        });
      }

      // Test 2: API endpoints (based on project type)
      const projectType = await this.detectProjectType(projectId);
      
      if (projectType === 'notes') {
        // Test notes API
        try {
          const notesTest = await axios.post(`${functionUrl}/notes`, {
            title: 'Test Note',
            content: 'This is a test note from ProjectDev'
          }, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          tests.push({
            name: 'Create Note',
            success: true,
            status: notesTest.status,
            data: notesTest.data
          });
        } catch (error: any) {
          tests.push({
            name: 'Create Note',
            success: false,
            error: error.message
          });
        }
      }

      // Test 3: Error handling
      try {
        const errorTest = await axios.get(`${functionUrl}/nonexistent-endpoint`);
        tests.push({
          name: 'Error Handling',
          success: false,
          error: 'Expected 404 but got success'
        });
      } catch (error: any) {
        if (error.response?.status === 404) {
          tests.push({
            name: 'Error Handling',
            success: true,
            status: 404,
            message: 'Correctly returned 404 for nonexistent endpoint'
          });
        } else {
          tests.push({
            name: 'Error Handling',
            success: false,
            error: error.message
          });
        }
      }

    } catch (error: any) {
      tests.push({
        name: 'Test Suite',
        success: false,
        error: error.message
      });
    }

    return tests;
  }

  /**
   * Detect project type from generated files
   */
  private static async detectProjectType(projectId: string): Promise<string> {
    try {
      const projectDir = path.join(process.cwd(), 'generated-projects', projectId, 'backend', 'src');
      
      if (await fs.pathExists(path.join(projectDir, 'controllers', 'NotesController.ts'))) {
        return 'notes';
      }
      
      if (await fs.pathExists(path.join(projectDir, 'controllers', 'CalculatorController.ts'))) {
        return 'calculator';
      }
      
      return 'generic';
    } catch (error) {
      return 'generic';
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
        console.log(`[ProjectDev] ${data.toString().trim()}`);
      });

      process.stderr?.on('data', (data) => {
        console.error(`[ProjectDev] Error: ${data.toString().trim()}`);
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
   * Clean up deployment package
   */
  static async cleanupDeployment(projectId: string): Promise<void> {
    try {
      const projectDir = path.join(process.cwd(), 'generated-projects', projectId, 'backend');
      const packagePath = path.join(projectDir, 'deployment-package');
      
      if (await fs.pathExists(packagePath)) {
        await fs.remove(packagePath);
        console.log(`[ProjectDev] Cleaned up deployment package for project: ${projectId}`);
      }
    } catch (error: any) {
      console.error(`[ProjectDev] Cleanup error: ${error.message}`);
    }
  }

  /**
   * Get deployment status
   */
  static async getDeploymentStatus(projectId: string): Promise<any> {
    try {
      const functionUrl = await this.getFunctionUrlFromTerraformState(projectId);
      
      if (!functionUrl) {
        return {
          deployed: false,
          message: 'Project not deployed'
        };
      }

      // Test if function is responding
      const healthResponse = await axios.get(`${functionUrl}/health`, {
        timeout: 5000
      });

      return {
        deployed: true,
        functionUrl,
        status: 'healthy',
        response: healthResponse.data
      };

    } catch (error: any) {
      return {
        deployed: false,
        error: error.message
      };
    }
  }
}