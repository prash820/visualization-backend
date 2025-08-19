// src/routes/project.ts
import express from "express";
import { 
  createProject, 
  getUserProjects, 
  getProject, 
  updateProject, 
  deleteProject, 
  archiveProject 
} from "../controllers/projectController";
import { authenticateToken } from "../middleware/authMiddleware";
import asyncHandler from "../utils/asyncHandler";
import { databaseService } from "../services/databaseService";

const router = express.Router();

// Development mode middleware that skips authentication for development
const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Skip authentication for all requests in development
    console.log("Development mode: Skipping authentication");
    next();
  } else {
    // Use normal authentication for production
    authenticateToken(req, res, next);
  }
};

// Get all projects for a user
router.get("/user/:userId", optionalAuth, asyncHandler(getUserProjects));

// Create a new project
router.post("/", optionalAuth, asyncHandler(createProject));

// Get a specific project
router.get("/:projectId", optionalAuth, asyncHandler(getProject));

// Update a project
router.put("/:projectId", optionalAuth, asyncHandler(updateProject));

// Delete a project
router.delete("/:projectId", optionalAuth, asyncHandler(deleteProject));

// Archive a project
router.patch("/:projectId/archive", optionalAuth, asyncHandler(archiveProject));

// Update project deployment status (called by Terraform runner - no auth required)
router.post('/:projectId/deployment-status', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { deploymentStatus, deploymentOutputs, lastDeployed } = req.body;
  
  console.log(`[Project] Updating deployment status for project ${projectId}: ${deploymentStatus}`);
  
  try {
    const project = databaseService.getProject(projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    
    // Update deployment status in metadata
    const metadata = project.metadata ? JSON.parse(project.metadata) : {};
    metadata.deploymentStatus = deploymentStatus;
    if (deploymentOutputs) {
      metadata.deploymentOutputs = deploymentOutputs;
    }
    if (lastDeployed) {
      metadata.lastDeployed = lastDeployed;
    }
    
    project.metadata = JSON.stringify(metadata);
    project.updatedAt = new Date().toISOString();
    project.lastAccessed = new Date().toISOString();
    
    databaseService.saveProject(project);
    
    console.log(`[Project] Successfully updated project ${projectId} deployment status to ${deploymentStatus}`);
    res.json({ success: true, message: "Deployment status updated" });
    
  } catch (error: any) {
    console.error(`[Project] Error updating deployment status for project ${projectId}:`, error);
    res.status(500).json({ error: error.message || "Failed to update deployment status" });
  }
}));

export default router;
