// src/controllers/appCodeController.ts
import { Request, Response } from 'express';
import { AppCodeConverter, AppCodeStructure } from '../services/appCodeConverter';
import fs from 'fs/promises';
import path from 'path';

export class AppCodeController {
  private converter: AppCodeConverter;

  constructor() {
    this.converter = new AppCodeConverter();
  }

  /**
   * Convert app-code.json to folder structure
   * POST /api/app-code/convert
   */
  async convertAppCode(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, appCode, options = {} } = req.body;

      if (!projectId || !appCode) {
        res.status(400).json({
          success: false,
          error: 'Project ID and app code are required'
        });
        return;
      }

      console.log(`[AppCodeController] Converting app code for project: ${projectId}`);

      // Convert app code to folder structure
      const result = await this.converter.convertAppCodeToFolderStructure(
        projectId,
        appCode as AppCodeStructure,
        {
          validateCode: options.validateCode || false,
          installDependencies: options.installDependencies || false,
          createPackageJson: options.createPackageJson || true
        }
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'App code converted successfully',
          data: {
            projectId,
            projectPath: result.projectPath,
            frontendPath: result.frontendPath,
            backendPath: result.backendPath,
            generatedFiles: result.generatedFiles.length,
            errors: result.errors,
            warnings: result.warnings
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'App code conversion failed',
          details: result.errors
        });
      }

    } catch (error: any) {
      console.error('[AppCodeController] Error during conversion:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Validate generated code
   * POST /api/app-code/validate
   */
  async validateGeneratedCode(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[AppCodeController] Validating code for project: ${projectId}`);

      const projectPath = path.join('generated-projects', projectId);
      
      if (!await this.pathExists(projectPath)) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      const validationResult = await this.validateProjectCode(projectPath);

      res.status(200).json({
        success: true,
        message: 'Code validation completed',
        data: validationResult
      });

    } catch (error: any) {
      console.error('[AppCodeController] Error during validation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get project structure
   * GET /api/app-code/structure/:projectId
   */
  async getProjectStructure(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[AppCodeController] Getting structure for project: ${projectId}`);

      const projectPath = path.join('generated-projects', projectId);
      
      if (!await this.pathExists(projectPath)) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      const structure = await this.getDirectoryStructure(projectPath);

      res.status(200).json({
        success: true,
        data: {
          projectId,
          structure,
          projectPath
        }
      });

    } catch (error: any) {
      console.error('[AppCodeController] Error getting structure:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Deploy project
   * POST /api/app-code/deploy
   */
  async deployProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, deploymentType = 'local' } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[AppCodeController] Deploying project: ${projectId} (${deploymentType})`);

      const projectPath = path.join('generated-projects', projectId);
      
      if (!await this.pathExists(projectPath)) {
        res.status(404).json({
          success: false,
          error: 'Project not found'
        });
        return;
      }

      const deploymentResult = await this.deployProjectToEnvironment(projectPath, deploymentType);

      res.status(200).json({
        success: true,
        message: 'Project deployment completed',
        data: deploymentResult
      });

    } catch (error: any) {
      console.error('[AppCodeController] Error during deployment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Helper methods
   */
  private async validateProjectCode(projectPath: string): Promise<any> {
    const result = {
      frontend: { valid: false, errors: [] as string[] },
      backend: { valid: false, errors: [] as string[] },
      overall: { valid: false, errors: [] as string[] }
    };

    try {
      // Validate frontend
      const frontendPath = path.join(projectPath, 'frontend');
      if (await this.pathExists(frontendPath)) {
        try {
          // Check for package.json
          const packageJsonPath = path.join(frontendPath, 'package.json');
          if (await this.pathExists(packageJsonPath)) {
            result.frontend.valid = true;
          } else {
            result.frontend.errors.push('Missing package.json');
          }

          // Check for essential files
          const essentialFiles = ['src/App.tsx', 'src/index.tsx', 'public/index.html'];
          for (const file of essentialFiles) {
            if (!await this.pathExists(path.join(frontendPath, file))) {
              result.frontend.errors.push(`Missing ${file}`);
            }
          }
        } catch (error: any) {
          result.frontend.errors.push(error.message);
        }
      }

      // Validate backend
      const backendPath = path.join(projectPath, 'backend');
      if (await this.pathExists(backendPath)) {
        try {
          // Check for package.json
          const packageJsonPath = path.join(backendPath, 'package.json');
          if (await this.pathExists(packageJsonPath)) {
            result.backend.valid = true;
          } else {
            result.backend.errors.push('Missing package.json');
          }

          // Check for essential files
          const essentialFiles = ['src/index.ts', 'tsconfig.json'];
          for (const file of essentialFiles) {
            if (!await this.pathExists(path.join(backendPath, file))) {
              result.backend.errors.push(`Missing ${file}`);
            }
          }
        } catch (error: any) {
          result.backend.errors.push(error.message);
        }
      }

      // Overall validation
      result.overall.valid = result.frontend.valid && result.backend.valid;
      result.overall.errors = [...result.frontend.errors, ...result.backend.errors];

    } catch (error: any) {
      result.overall.errors.push(error.message);
    }

    return result;
  }

  private async getDirectoryStructure(dirPath: string): Promise<any> {
    const structure: any = {};

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          structure[item.name] = await this.getDirectoryStructure(fullPath);
        } else {
          structure[item.name] = 'file';
        }
      }
    } catch (error: any) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return structure;
  }

  private async deployProjectToEnvironment(projectPath: string, deploymentType: string): Promise<any> {
    const result = {
      success: false,
      deploymentType,
      frontendUrl: null as string | null,
      backendUrl: null as string | null,
      errors: [] as string[]
    };

    try {
      if (deploymentType === 'local') {
        // Local deployment
        const frontendPath = path.join(projectPath, 'frontend');
        const backendPath = path.join(projectPath, 'backend');

        if (await this.pathExists(frontendPath)) {
          result.frontendUrl = 'http://localhost:3000';
        }

        if (await this.pathExists(backendPath)) {
          result.backendUrl = 'http://localhost:5001';
        }

        result.success = true;
      } else {
        result.errors.push(`Deployment type '${deploymentType}' not supported`);
      }
    } catch (error: any) {
      result.errors.push(error.message);
    }

    return result;
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}