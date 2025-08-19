// src/controllers/projectDevelopmentController.ts
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ProjectLocalDevelopment, ProjectDeploymentConfig } from '../utils/projectLocalDevelopment';

interface ProjectDeploymentRequest {
  projectId: string;
  config?: Partial<ProjectDeploymentConfig>;
}

interface ProjectTestRequest {
  projectId: string;
  functionUrl?: string;
}

export class ProjectDevelopmentController {
  
  /**
   * Deploy a project to AWS Lambda for testing
   */
  static async deployProjectForTesting(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, config = {} }: ProjectDeploymentRequest = req.body;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      console.log(`[ProjectDev] Deploying project for testing: ${projectId}`);

      // Deploy the project
      const result = await ProjectLocalDevelopment.deployProjectForTesting(projectId, config);
      
      if (result.success) {
        res.json({
          success: true,
          deploymentId: result.deploymentId,
          functionUrl: result.functionUrl,
          apiGatewayUrl: result.apiGatewayUrl,
          logs: result.logs,
          message: 'Project deployed successfully for testing'
        });
      } else {
        res.status(500).json({
          success: false,
          deploymentId: result.deploymentId,
          errors: result.errors,
          logs: result.logs,
          message: 'Project deployment failed'
        });
      }

    } catch (error: any) {
      console.error(`[ProjectDev] Error deploying project:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Test a deployed project
   */
  static async testDeployedProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, functionUrl }: ProjectTestRequest = req.body;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      console.log(`[ProjectDev] Testing deployed project: ${projectId}`);

      // Test the deployed project
      const result = await ProjectLocalDevelopment.testDeployedProject(projectId, functionUrl);
      
      if (result.success) {
        res.json({
          success: true,
          response: result.response,
          message: 'Project test completed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          message: 'Project test failed'
        });
      }

    } catch (error: any) {
      console.error(`[ProjectDev] Error testing project:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get deployment status for a project
   */
  static async getDeploymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      console.log(`[ProjectDev] Getting deployment status for project: ${projectId}`);

      // Get deployment status
      const status = await ProjectLocalDevelopment.getDeploymentStatus(projectId);
      
      res.json({
        success: true,
        projectId,
        status,
        message: 'Deployment status retrieved'
      });

    } catch (error: any) {
      console.error(`[ProjectDev] Error getting deployment status:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Clean up deployment for a project
   */
  static async cleanupDeployment(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      console.log(`[ProjectDev] Cleaning up deployment for project: ${projectId}`);

      // Clean up deployment
      await ProjectLocalDevelopment.cleanupDeployment(projectId);
      
      res.json({
        success: true,
        projectId,
        message: 'Deployment cleaned up successfully'
      });

    } catch (error: any) {
      console.error(`[ProjectDev] Error cleaning up deployment:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get available projects for testing
   */
  static async getAvailableProjects(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[ProjectDev] Getting available projects for testing`);

      const projectsDir = path.join(process.cwd(), 'generated-projects');
      const projects = [];

      if (await fs.pathExists(projectsDir)) {
        const projectIds = await fs.readdir(projectsDir);
        
        for (const projectId of projectIds) {
          const projectDir = path.join(projectsDir, projectId);
          const terraformStatePath = path.join(process.cwd(), 'terraform-runner', 'workspace', projectId, 'terraform.tfstate');
          
          const projectInfo = {
            projectId,
            hasBackend: await fs.pathExists(path.join(projectDir, 'backend')),
            hasInfrastructure: await fs.pathExists(terraformStatePath),
            deploymentStatus: await ProjectLocalDevelopment.getDeploymentStatus(projectId)
          };
          
          projects.push(projectInfo);
        }
      }

      res.json({
        success: true,
        projects,
        totalProjects: projects.length,
        message: 'Available projects retrieved'
      });

    } catch (error: any) {
      console.error(`[ProjectDev] Error getting available projects:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get project details
   */
  static async getProjectDetails(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      console.log(`[ProjectDev] Getting project details: ${projectId}`);

      const projectDir = path.join(process.cwd(), 'generated-projects', projectId);
      const backendDir = path.join(projectDir, 'backend');
      const terraformStatePath = path.join(process.cwd(), 'terraform-runner', 'workspace', projectId, 'terraform.tfstate');
      
      if (!await fs.pathExists(projectDir)) {
        res.status(404).json({
          success: false,
          errors: [`Project not found: ${projectId}`],
          message: 'Project not found'
        });
        return;
      }

      // Get project structure
      const projectStructure: {
        hasBackend: boolean;
        hasFrontend: boolean;
        hasInfrastructure: boolean;
        backendFiles: string[];
        terraformOutputs: any;
      } = {
        hasBackend: await fs.pathExists(backendDir),
        hasFrontend: await fs.pathExists(path.join(projectDir, 'frontend')),
        hasInfrastructure: await fs.pathExists(terraformStatePath),
        backendFiles: [],
        terraformOutputs: null
      };

      // Get backend files if they exist
      if (projectStructure.hasBackend) {
        try {
          const backendFiles = await ProjectDevelopmentController.getBackendFiles(backendDir);
          projectStructure.backendFiles = backendFiles;
        } catch (error) {
          console.error(`[ProjectDev] Error getting backend files: ${error}`);
          projectStructure.backendFiles = [];
        }
      }

      // Get terraform outputs if they exist
      if (projectStructure.hasInfrastructure) {
        try {
          const terraformState = await fs.readJson(terraformStatePath);
          projectStructure.terraformOutputs = terraformState.outputs || {};
        } catch (error) {
          console.error(`[ProjectDev] Error reading terraform state: ${error}`);
        }
      }

      // Get deployment status
      const deploymentStatus = await ProjectLocalDevelopment.getDeploymentStatus(projectId);

      res.json({
        success: true,
        projectId,
        projectStructure,
        deploymentStatus,
        message: 'Project details retrieved'
      });

    } catch (error: any) {
      console.error(`[ProjectDev] Error getting project details:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get backend files structure
   */
  private static async getBackendFiles(backendDir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const walkDir = async (dir: string, prefix: string = ''): Promise<void> => {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            await walkDir(fullPath, `${prefix}${item}/`);
          } else {
            files.push(`${prefix}${item}`);
          }
        }
      };
      
      await walkDir(backendDir);
    } catch (error) {
      console.error(`[ProjectDev] Error walking backend directory: ${error}`);
    }
    
    return files;
  }
} 