import { Request, Response } from 'express';
import { CodeGenerationOrchestrator, CodeGenerationOptions } from '../services/codeGenerationOrchestrator';
import AICodeGenerationService, { AICodeGenerationOptions } from '../services/aiCodeGenerationService';

export class CodeGenerationController {
  private orchestrator: CodeGenerationOrchestrator;
  private aiService: AICodeGenerationService;

  constructor() {
    this.orchestrator = new CodeGenerationOrchestrator('');
    this.aiService = new AICodeGenerationService();
  }

  /**
   * Generate complete application using AI
   * POST /api/code-generation/generate
   */
  async generateApplication(req: Request, res: Response): Promise<void> {
    try {
      const { userPrompt, targetCustomers, projectId, options } = req.body;

      if (!userPrompt || !projectId) {
        res.status(400).json({
          success: false,
          error: 'User prompt and project ID are required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Starting AI-powered application generation for project ${projectId}`);
      console.log(`[CodeGenerationController] User prompt: ${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}`);

      // Prepare AI generation options
      const aiOptions: AICodeGenerationOptions = {
        userPrompt,
        targetCustomers: targetCustomers || 'General users',
        projectId,
        forceRegenerate: options?.forceRegenerate || false
      };

      // Generate application using AI
      const result = await this.aiService.generateCompleteApplication(aiOptions);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'AI-powered application generation completed successfully',
          data: {
            projectId,
            generatedFiles: result.generatedFiles.length,
            analysisResult: result.analysisResult,
            umlDiagrams: result.umlDiagrams,
            infrastructureCode: result.infrastructureCode,
            warnings: result.warnings,
            errors: result.errors
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'AI-powered application generation failed',
          details: result.errors
        });
      }

    } catch (error: any) {
      console.error('[CodeGenerationController] Error during AI generation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Validate generated code without deployment
   * POST /api/code-generation/validate
   */
  async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Validating code for project ${projectId}`);

      // Create orchestrator for this project
      const orchestrator = new CodeGenerationOrchestrator(projectId);

      // Validate code
      const result = await orchestrator.validateGeneratedCode(projectId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Code validation completed',
          data: {
            projectId,
            warnings: result.warnings
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Code validation failed',
          details: result.errors
        });
      }

    } catch (error: any) {
      console.error('[CodeGenerationController] Error validating code:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get generation status and progress
   * GET /api/code-generation/status/:projectId
   */
  async getGenerationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Getting generation status for project ${projectId}`);

      // Create orchestrator for this project
      const orchestrator = new CodeGenerationOrchestrator(projectId);

      // Get status
      const status = await orchestrator.getGenerationStatus(projectId);

      res.status(200).json({
        success: true,
        data: {
          projectId,
          status: status.status,
          progress: status.progress,
          currentPhase: status.currentPhase,
          errors: status.errors
        }
      });

    } catch (error: any) {
      console.error('[CodeGenerationController] Error getting generation status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get generation statistics
   * GET /api/code-generation/statistics/:projectId
   */
  async getGenerationStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Getting generation statistics for project ${projectId}`);

      // Create orchestrator for this project
      const orchestrator = new CodeGenerationOrchestrator(projectId);

      // Get statistics
      const statistics = await orchestrator.getGenerationStatistics(projectId);

      res.status(200).json({
        success: true,
        data: {
          projectId,
          statistics
        }
      });

    } catch (error: any) {
      console.error('[CodeGenerationController] Error getting generation statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Clean up generated files
   * DELETE /api/code-generation/cleanup/:projectId
   */
  async cleanupGeneratedFiles(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Cleaning up generated files for project ${projectId}`);

      // Create orchestrator for this project
      const orchestrator = new CodeGenerationOrchestrator(projectId);

      // Clean up files
      await orchestrator.cleanupGeneratedFiles(projectId);

      res.status(200).json({
        success: true,
        message: 'Generated files cleaned up successfully',
        data: {
          projectId
        }
      });

    } catch (error: any) {
      console.error('[CodeGenerationController] Error cleaning up generated files:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get detailed generation results
   * GET /api/code-generation/results/:projectId
   */
  async getGenerationResults(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Getting generation results for project ${projectId}`);

      // Create orchestrator for this project
      const orchestrator = new CodeGenerationOrchestrator(projectId);

      // Get detailed results
      const result = await orchestrator.generateApplication({
        projectId,
        validateOnly: true,
        skipDeployment: true
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            projectId: result.projectId,
            generatedFiles: result.generatedFiles,
            taskPlan: result.taskPlan,
            validationResults: result.validationResults,
            infrastructureContext: result.infrastructureContext,
            warnings: result.warnings
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get generation results',
          details: result.errors
        });
      }

    } catch (error: any) {
      console.error('[CodeGenerationController] Error getting generation results:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get specific generated file content
   * GET /api/code-generation/file/:projectId/:filePath
   */
  async getGeneratedFile(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, filePath } = req.params;

      if (!projectId || !filePath) {
        res.status(400).json({
          success: false,
          error: 'Project ID and file path are required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Getting file ${filePath} for project ${projectId}`);

      // Create orchestrator for this project
      const orchestrator = new CodeGenerationOrchestrator(projectId);

      // Get all generated files
      const result = await orchestrator.generateApplication({
        projectId,
        validateOnly: true,
        skipDeployment: true
      });

      if (result.success) {
        // Find the specific file
        const file = result.generatedFiles.find(f => f.path === filePath);
        
        if (file) {
          res.status(200).json({
            success: true,
            data: {
              projectId,
              filePath,
              content: file.content,
              size: file.content.length
            }
          });
        } else {
          res.status(404).json({
            success: false,
            error: 'File not found',
            data: {
              projectId,
              filePath,
              availableFiles: result.generatedFiles.map(f => f.path)
            }
          });
        }
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get file',
          details: result.errors
        });
      }

    } catch (error: any) {
      console.error('[CodeGenerationController] Error getting generated file:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Get task plan for a project
   * GET /api/code-generation/task-plan/:projectId
   */
  async getTaskPlan(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Retrieving task plan for project ${projectId}`);

      // Load task plan from file
      const fs = require('fs').promises;
      const path = require('path');
      
      const projectPath = path.join(process.cwd(), 'generated-projects', projectId);
      const taskPlanPath = path.join(projectPath, 'task-plan.json');

      try {
        const taskPlanContent = await fs.readFile(taskPlanPath, 'utf8');
        const taskPlan = JSON.parse(taskPlanContent);

        res.status(200).json({
          success: true,
          message: 'Task plan retrieved successfully',
          data: {
            projectId,
            taskPlan,
            filePath: taskPlanPath
          }
        });

      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          res.status(404).json({
            success: false,
            error: 'Task plan not found',
            message: 'No task plan file exists for this project. Run code generation first.'
          });
        } else {
          throw fileError;
        }
      }

    } catch (error: any) {
      console.error('[CodeGenerationController] Error retrieving task plan:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task plan',
        details: error.message
      });
    }
  }

  /**
   * Generate application from idea (no UML required)
   * POST /api/code-generation/generate-from-idea
   */
  async generateFromIdea(req: Request, res: Response): Promise<void> {
    try {
      const { userPrompt, targetCustomers, projectId, options } = req.body;

      if (!userPrompt || !projectId) {
        res.status(400).json({
          success: false,
          error: 'User prompt and project ID are required'
        });
        return;
      }

      console.log(`[CodeGenerationController] Starting idea-to-app generation for project ${projectId}`);
      console.log(`[CodeGenerationController] User idea: ${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}`);

      // Check if project already exists
      const existingProject = await this.aiService.getExistingProjectData(projectId);
      const isUsingExistingData = existingProject && !options?.forceRegenerate;

      if (isUsingExistingData) {
        console.log(`[CodeGenerationController] Using existing project data for ${projectId}`);
        
        // Convert existing app code to file structure
        const generatedFiles = existingProject.appCode ? 
          this.aiService.convertAppCodeToFiles(existingProject.appCode) : [];

        res.status(200).json({
          success: true,
          message: 'Using existing project data',
          data: {
            projectId,
            appName: existingProject.name || 'Existing App',
            generatedFiles: generatedFiles.length,
            frontendComponents: Object.keys(existingProject.appCode?.frontend?.components || {}).length,
            backendControllers: Object.keys(existingProject.appCode?.backend?.controllers || {}).length,
            analysisResult: {
              appSummary: {
                name: existingProject.name,
                description: existingProject.description
              }
            },
            umlDiagrams: existingProject.umlDiagrams,
            infrastructureCode: existingProject.infraCode,
            appCode: existingProject.appCode,
            warnings: [],
            errors: [],
            isExistingData: true,
            dataSource: 'projects.json'
          }
        });
        return;
      }

      // Prepare AI generation options
      const aiOptions: AICodeGenerationOptions = {
        userPrompt,
        targetCustomers: targetCustomers || 'General users',
        projectId,
        forceRegenerate: options?.forceRegenerate || false
      };

      // Generate application using AI (automated workflow)
      const result = await this.aiService.generateCompleteApplication(aiOptions);

      if (result.success) {
        // Determine data source based on what was used
        const dataSource = existingProject ? 'mixed (existing + generated)' : 'new generation';
        
        res.status(200).json({
          success: true,
          message: 'Idea-to-app generation completed successfully',
          data: {
            projectId,
            appName: result.analysisResult?.appSummary?.name || 'Generated App',
            generatedFiles: result.generatedFiles.length,
            frontendComponents: Object.keys(result.appCode?.frontend?.components || {}).length,
            backendControllers: Object.keys(result.appCode?.backend?.controllers || {}).length,
            analysisResult: result.analysisResult,
            umlDiagrams: result.umlDiagrams,
            infrastructureCode: result.infrastructureCode,
            appCode: result.appCode,
            warnings: result.warnings,
            errors: result.errors,
            isExistingData: false,
            dataSource: dataSource
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Idea-to-app generation failed',
          details: result.errors
        });
      }

    } catch (error: any) {
      console.error('[CodeGenerationController] Error during idea-to-app generation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  /**
   * Health check for code generation service
   * GET /api/code-generation/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'AI Code Generation Engine is healthy',
        data: {
          service: 'AI Code Generation Engine',
          version: '2.0.0',
          status: 'operational',
          features: [
            'AI-powered application generation',
            'Automated idea-to-app workflow',
            'Comprehensive UI component generation',
            'AWS infrastructure integration',
            'Production-ready code generation'
          ],
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('[CodeGenerationController] Health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
} 