import path from 'path';
import { UMLIntermediateRepresentation, TaskPlan } from './codeGenerationEngine';
import { InfrastructureContext } from '../types/infrastructure';
import { InfrastructureService } from './infrastructureService';
import { loadUmlDiagrams } from '../utils/umlUtils';
import { GenerationOrchestrator } from './generation/GenerationOrchestrator';

export interface CodeGenerationResult {
  success: boolean;
  projectId: string;
  deploymentUrl?: string;
  errors: string[];
  warnings: string[];
  generatedFiles: Array<{ path: string; content: string }>;
  taskPlan?: TaskPlan;
  validationResults?: any;
  infrastructureContext?: InfrastructureContext;
}

export interface CodeGenerationOptions {
  projectId: string;
  validateOnly?: boolean;
  skipDeployment?: boolean;
  forceRegenerate?: boolean;
  targetEnvironment?: 'development' | 'staging' | 'production';
}

export class CodeGenerationOrchestrator {
  private generationOrchestrator: GenerationOrchestrator;
  private projectPath: string;
  private infrastructureContext: InfrastructureContext;

  constructor(projectId: string) {
    this.projectPath = path.join(process.cwd(), 'generated-projects', projectId);
    this.infrastructureContext = {} as InfrastructureContext;
    this.generationOrchestrator = new GenerationOrchestrator(this.projectPath, this.infrastructureContext);
  }

  /**
   * Main entry point for the Code Generation Engine
   * Orchestrates the entire multi-agent compiler pipeline
   */
  async generateApplication(options: CodeGenerationOptions): Promise<CodeGenerationResult> {
    console.log(`[CodeGenerationOrchestrator] Starting application generation for project ${options.projectId}`);

    const result: CodeGenerationResult = {
      success: false,
      projectId: options.projectId,
      errors: [],
      warnings: [],
      generatedFiles: []
    };

    try {
      // Step 1: Load UML diagrams
      console.log('[CodeGenerationOrchestrator] Loading UML diagrams');
      const umlDiagrams = await loadUmlDiagrams(options.projectId);
      
      if (!umlDiagrams) {
        throw new Error('No UML diagrams found for project');
      }

      // Step 2: Get infrastructure context
      console.log('[CodeGenerationOrchestrator] Retrieving infrastructure context');
      await this.loadInfrastructureContext(options.projectId);

      // Step 3: Run the Generation Orchestrator
      console.log('[CodeGenerationOrchestrator] Running Generation Orchestrator');
      const generationResult = await this.generationOrchestrator.generateApplication(umlDiagrams);

      // Step 4: Process results
      result.success = generationResult.success;
      result.deploymentUrl = generationResult.deploymentUrl;
      result.errors = generationResult.errors;

      if (result.success) {
        console.log('[CodeGenerationOrchestrator] Application generation completed successfully');
        
        // Load generated files for reporting
        result.generatedFiles = await this.loadGeneratedFiles();
        
        // Load task plan for reporting
        result.taskPlan = await this.loadTaskPlan(umlDiagrams);
        
        // Load validation results
        result.validationResults = await this.loadValidationResults();
        
        // Add infrastructure context to result
        result.infrastructureContext = this.infrastructureContext;
      }

    } catch (error: any) {
      console.error('[CodeGenerationOrchestrator] Error during generation:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Load infrastructure context from Terraform state
   */
  private async loadInfrastructureContext(projectId: string): Promise<void> {
    try {
      // Get Terraform state
      const terraformState = await InfrastructureService.getTerraformState(projectId);
      
      if (terraformState) {
        // Get Terraform outputs
        const terraformOutputs = await InfrastructureService.getTerraformOutputs(projectId);
        
        // Extract infrastructure context from state and outputs
        this.infrastructureContext = this.extractInfrastructureContext(terraformState, terraformOutputs);
      } else {
        // Use default context
      }

      // Update the generation orchestrator with the infrastructure context
      this.generationOrchestrator = new GenerationOrchestrator(this.projectPath, this.infrastructureContext);
      
    } catch (error: any) {
      console.warn('[CodeGenerationOrchestrator] Failed to load infrastructure context:', error.message);
    }
  }

  /**
   * Extract infrastructure context from Terraform state and outputs
   */
  private extractInfrastructureContext(terraformState: any, terraformOutputs: any): InfrastructureContext {
    const context: InfrastructureContext = {};

    // Extract from Terraform outputs
    if (terraformOutputs) {
      context.databaseUrl = terraformOutputs.database_url?.value;
      context.databaseName = terraformOutputs.database_name?.value;
      context.apiGatewayUrl = terraformOutputs.api_gateway_url?.value;
      context.lambdaFunctionUrl = terraformOutputs.lambda_function_url?.value;
      context.s3BucketName = terraformOutputs.s3_bucket_name?.value;
      context.dynamoDbTableName = terraformOutputs.dynamodb_table_name?.value;
      context.loadBalancerUrl = terraformOutputs.load_balancer_url?.value;
      context.cloudfrontUrl = terraformOutputs.cloudfront_url?.value;
      context.cognitoUserPoolId = terraformOutputs.cognito_user_pool_id?.value;
      context.cognitoClientId = terraformOutputs.cognito_client_id?.value;
    }

    // Extract from Terraform state
    if (terraformState) {
      // Parse state to extract additional resources
      const resources = terraformState.resources || [];
      
      for (const resource of resources) {
        if (resource.type === 'aws_db_instance') {
          context.databaseUrl = resource.instances?.[0]?.attributes?.endpoint;
        } else if (resource.type === 'aws_lambda_function') {
          context.lambdaFunctionUrl = resource.instances?.[0]?.attributes?.invoke_arn;
        } else if (resource.type === 'aws_s3_bucket') {
          context.s3BucketName = resource.instances?.[0]?.attributes?.bucket;
        }
      }
    }

    return context;
  }

  /**
   * Load generated files for reporting
   */
  private async loadGeneratedFiles(): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];
    
    try {
      const fs = require('fs/promises');
      const path = require('path');
      
      // Recursively read all files in the project directory
      const readDirectory = async (dirPath: string, relativePath: string = ''): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            await readDirectory(fullPath, relativeFilePath);
          } else if (entry.isFile()) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              files.push({
                path: relativeFilePath,
                content
              });
            } catch (error) {
              console.warn(`[CodeGenerationOrchestrator] Failed to read file ${relativeFilePath}:`, error);
            }
          }
        }
      };
      
      await readDirectory(this.projectPath);
      
    } catch (error: any) {
      console.warn('[CodeGenerationOrchestrator] Failed to load generated files:', error.message);
    }
    
    return files;
  }

  /**
   * Load task plan for reporting
   */
  private async loadTaskPlan(umlDiagrams: any): Promise<TaskPlan | undefined> {
    try {
      // Create a temporary orchestrator to generate the task plan
      const tempOrchestrator = new GenerationOrchestrator(this.projectPath, this.infrastructureContext);
      
      // This would require exposing the task planning functionality
      // For now, return undefined
      return undefined;
      
    } catch (error: any) {
      console.warn('[CodeGenerationOrchestrator] Failed to load task plan:', error.message);
      return undefined;
    }
  }

  /**
   * Load validation results for reporting
   */
  private async loadValidationResults(): Promise<any | undefined> {
    try {
      // This would load validation results from the build process
      // For now, return undefined
      return undefined;
      
    } catch (error: any) {
      console.warn('[CodeGenerationOrchestrator] Failed to load validation results:', error.message);
      return undefined;
    }
  }

  /**
   * Validate generated code without deployment
   */
  async validateGeneratedCode(projectId: string): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log(`[CodeGenerationOrchestrator] Validating generated code for project ${projectId}`);
    
    try {
      // Load UML diagrams
      const umlDiagrams = await loadUmlDiagrams(projectId);
      
      if (!umlDiagrams) {
        throw new Error('No UML diagrams found for project');
      }

      // Load infrastructure context
      await this.loadInfrastructureContext(projectId);

      // Create orchestrator with validation-only mode
      const validationOrchestrator = new GenerationOrchestrator(this.projectPath, this.infrastructureContext);
      
      // Run validation (this would need to be exposed in the engine)
      // For now, return a placeholder
      return {
        success: true,
        errors: [],
        warnings: []
      };
      
    } catch (error: any) {
      console.error('[CodeGenerationOrchestrator] Validation failed:', error);
      return {
        success: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Get generation status and progress
   */
  async getGenerationStatus(projectId: string): Promise<{
    status: 'pending' | 'generating' | 'validating' | 'deploying' | 'completed' | 'failed';
    progress: number;
    currentPhase: string;
    errors: string[];
  }> {
    // This would track the generation progress
    // For now, return a placeholder
    return {
      status: 'completed',
      progress: 100,
      currentPhase: 'completed',
      errors: []
    };
  }

  /**
   * Clean up generated files
   */
  async cleanupGeneratedFiles(projectId: string): Promise<void> {
    try {
      const fs = require('fs/promises');
      const path = require('path');
      
      const projectPath = path.join(process.cwd(), 'generated-projects', projectId);
      
      // Check if project directory exists
      try {
        await fs.access(projectPath);
      } catch {
        console.log(`[CodeGenerationOrchestrator] Project directory ${projectId} does not exist`);
        return;
      }
      
      // Remove the entire project directory
      await fs.rm(projectPath, { recursive: true, force: true });
      
      console.log(`[CodeGenerationOrchestrator] Cleaned up generated files for project ${projectId}`);
      
    } catch (error: any) {
      console.error('[CodeGenerationOrchestrator] Failed to cleanup generated files:', error);
    }
  }

  /**
   * Get generation statistics
   */
  async getGenerationStatistics(projectId: string): Promise<{
    totalFiles: number;
    backendFiles: number;
    frontendFiles: number;
    testFiles: number;
    configFiles: number;
    totalLines: number;
    generationTime: number;
  }> {
    try {
      const files = await this.loadGeneratedFiles();
      
      const stats = {
        totalFiles: files.length,
        backendFiles: files.filter(f => f.path.includes('src/') && !f.path.includes('components/')).length,
        frontendFiles: files.filter(f => f.path.includes('components/') || f.path.includes('pages/')).length,
        testFiles: files.filter(f => f.path.includes('test') || f.path.includes('.test.') || f.path.includes('.spec.')).length,
        configFiles: files.filter(f => f.path.includes('package.json') || f.path.includes('tsconfig') || f.path.includes('vite.config')).length,
        totalLines: files.reduce((sum, file) => sum + file.content.split('\n').length, 0),
        generationTime: 0 // This would be tracked during generation
      };
      
      return stats;
      
    } catch (error: any) {
      console.error('[CodeGenerationOrchestrator] Failed to get generation statistics:', error);
      return {
        totalFiles: 0,
        backendFiles: 0,
        frontendFiles: 0,
        testFiles: 0,
        configFiles: 0,
        totalLines: 0,
        generationTime: 0
      };
    }
  }
} 