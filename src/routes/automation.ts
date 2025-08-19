import express from 'express';
import { AutomationController } from '../controllers/automationController';

const router = express.Router();
const automationController = new AutomationController();

/**
 * Start a new automation job
 * POST /api/automation/start
 */
router.post('/start', automationController.startAutomationJob.bind(automationController));

/**
 * Get job status
 * GET /api/automation/status/:jobId
 */
router.get('/status/:jobId', automationController.getJobStatus.bind(automationController));

/**
 * Get all jobs
 * GET /api/automation/jobs
 */
router.get('/jobs', automationController.getAllJobs.bind(automationController));

/**
 * Cancel a job
 * POST /api/automation/cancel/:jobId
 */
router.post('/cancel/:jobId', automationController.cancelJob.bind(automationController));

/**
 * Get job logs
 * GET /api/automation/logs/:jobId
 */
router.get('/logs/:jobId', automationController.getJobLogs.bind(automationController));

/**
 * Health check
 * GET /api/automation/health
 */
router.get('/health', automationController.healthCheck.bind(automationController));

export default router; 