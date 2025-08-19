import { Request, Response } from 'express';
import { AutomationService, AutomationOptions } from '../services/automationService';

export class AutomationController {
  private automationService: AutomationService;

  constructor() {
    this.automationService = new AutomationService();
  }

  /**
   * Start a new automation job
   * POST /api/automation/start
   */
  async startAutomationJob(req: Request, res: Response): Promise<void> {
    try {
      const { userPrompt, targetCustomers, projectId, forceRegenerate, autoDeploy, generateDocumentation } = req.body;

      if (!userPrompt || !projectId) {
        res.status(400).json({
          success: false,
          error: 'User prompt and project ID are required'
        });
        return;
      }

      console.log(`[AutomationController] Starting automation job for project: ${projectId}`);

      const options: AutomationOptions = {
        userPrompt,
        targetCustomers,
        projectId,
        forceRegenerate: forceRegenerate || false,
        autoDeploy: autoDeploy || false,
        generateDocumentation: generateDocumentation || true
      };

      const jobId = await this.automationService.startAutomationJob(options);

      res.status(200).json({
        success: true,
        message: 'Automation job started successfully',
        data: {
          jobId,
          status: 'pending',
          phase: 'analysis',
          progress: 0,
          estimatedTime: '5-10 minutes'
        }
      });

    } catch (error: any) {
      console.error('[AutomationController] Error starting automation job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start automation job',
        details: error.message
      });
    }
  }

  /**
   * Get job status
   * GET /api/automation/status/:jobId
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      console.log(`[AutomationController] Getting status for job: ${jobId}`);

      const job = this.automationService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          phase: job.phase,
          progress: job.progress,
          userPrompt: job.userPrompt,
          targetCustomers: job.targetCustomers,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          result: job.result
        }
      });

    } catch (error: any) {
      console.error('[AutomationController] Error getting job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        details: error.message
      });
    }
  }

  /**
   * Get all jobs
   * GET /api/automation/jobs
   */
  async getAllJobs(req: Request, res: Response): Promise<void> {
    try {
      console.log('[AutomationController] Getting all jobs');

      const jobs = this.automationService.getAllJobs();

      res.status(200).json({
        success: true,
        data: {
          jobs: jobs.map(job => ({
            jobId: job.id,
            status: job.status,
            phase: job.phase,
            progress: job.progress,
            userPrompt: job.userPrompt,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt
          })),
          totalJobs: jobs.length
        }
      });

    } catch (error: any) {
      console.error('[AutomationController] Error getting all jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get jobs',
        details: error.message
      });
    }
  }

  /**
   * Cancel a job
   * POST /api/automation/cancel/:jobId
   */
  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      console.log(`[AutomationController] Canceling job: ${jobId}`);

      // For now, we'll just return success since the automation service
      // doesn't have a cancel method yet. In a real implementation,
      // you would add a cancel method to the AutomationService.
      res.status(200).json({
        success: true,
        message: 'Job cancellation requested',
        data: {
          jobId,
          status: 'canceling'
        }
      });

    } catch (error: any) {
      console.error('[AutomationController] Error canceling job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
        details: error.message
      });
    }
  }

  /**
   * Get job logs
   * GET /api/automation/logs/:jobId
   */
  async getJobLogs(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      console.log(`[AutomationController] Getting logs for job: ${jobId}`);

      const job = this.automationService.getJobStatus(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
        return;
      }

      // In a real implementation, you would have actual logs
      // For now, we'll return the job details as logs
      const logs = [
        `Job ${jobId} started at ${job.createdAt}`,
        `Current phase: ${job.phase}`,
        `Progress: ${job.progress}%`,
        `Status: ${job.status}`,
        ...(job.result?.errors || []).map(error => `ERROR: ${error}`),
        ...(job.result?.warnings || []).map(warning => `WARNING: ${warning}`)
      ];

      res.status(200).json({
        success: true,
        data: {
          jobId,
          logs,
          totalLogs: logs.length
        }
      });

    } catch (error: any) {
      console.error('[AutomationController] Error getting job logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job logs',
        details: error.message
      });
    }
  }

  /**
   * Health check for automation service
   * GET /api/automation/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const jobs = this.automationService.getAllJobs();
      const activeJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending');

      res.status(200).json({
        success: true,
        data: {
          service: 'Automation Service',
          version: '1.0.0',
          status: 'healthy',
          totalJobs: jobs.length,
          activeJobs: activeJobs.length,
          features: [
            'UML Generation',
            'Infrastructure as Code',
            'Infrastructure Provisioning',
            'Application Code Generation',
            'Folder Structure Conversion',
            'Application Deployment',
            'Documentation Generation'
          ]
        }
      });

    } catch (error: any) {
      console.error('[AutomationController] Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
} 