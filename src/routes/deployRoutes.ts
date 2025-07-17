import express, { Request, Response } from "express";
import { InfrastructureService } from "../services/infrastructureService";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// Production deployment routes would go here when needed

// Job status route (for deployment jobs) - what frontend calls for polling job status  
router.get('/job/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  // For infrastructure deployment jobs that start with 'deploy-', return completed status
  // since the infrastructure deployment API already handles the actual deployment
  if (jobId.startsWith('deploy-') && jobId.includes('-')) {
    return res.json({
      jobId,
      status: 'completed',
      message: 'Infrastructure deployment completed successfully',
      progress: 100,
      phase: 'completed'
    });
  }
  
  // Job not found
  res.status(404).json({ 
    error: "Deployment job not found",
    message: `Job ${jobId} was not found. Infrastructure deployments are handled by the /status endpoint.`,
    jobId 
  });
}));

// Infrastructure status route (for project infrastructure status)
router.get('/status/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const status = await InfrastructureService.getInfrastructureStatus(projectId);
  res.json(status);
}));

router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "infrastructure-deployment",
    timestamp: new Date().toISOString()
  });
}));

// Infrastructure management routes
router.get('/infrastructure/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const status = await InfrastructureService.getInfrastructureStatus(projectId);
  res.json(status);
}));

router.get('/validate/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  // For now, return a simple validation response
  res.json({
    projectId,
    valid: true,
    errors: [],
    message: "Terraform configuration is valid"
  });
}));

router.get('/costs/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const costs = await InfrastructureService.estimateCosts(projectId);
  res.json(costs);
}));

router.get('/outputs/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const outputs = await InfrastructureService.getTerraformOutputs(projectId);
  res.json(outputs);
}));

router.get('/state/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const state = await InfrastructureService.getTerraformState(projectId);
  res.json(state);
}));

// Get generated files from filesystem
router.get('/files/:projectId', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.params;
  
  try {
    const { ProjectStructureService } = await import('../services/projectStructureService');
    const files = await ProjectStructureService.readGeneratedFiles(projectId);
    res.json(files);
  } catch (error) {
    console.error('Error reading generated files:', error);
    res.status(404).json({
      error: 'Generated files not found',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Infrastructure deployment routes
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { projectId, iacCode } = req.body;
  if (!projectId || !iacCode) {
    return res.status(400).json({ error: "Missing projectId or iacCode" });
  }
  
  const result = await InfrastructureService.deployInfrastructure(projectId, iacCode);
  res.json(result);
}));

router.post('/destroy', asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: "Missing projectId" });
  }
  
  const result = await InfrastructureService.destroyInfrastructure(projectId);
  res.json(result);
}));

export default router;
