// src/routes/project.ts
import express from "express";
import { getProjects, createProject, updateProject, removeProject, getProject, saveProjectState } from "../controllers/projectController";
import { authenticateToken } from "../middleware/authMiddleware";
import asyncHandler from "../utils/asyncHandler";
import { getProjectById, saveProject } from "../utils/projectFileStore";

const router = express.Router();

// Development mode middleware that skips authentication for GET requests
const optionalAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isGetRequest = req.method === 'GET';
  
  if (isDevelopment && isGetRequest) {
    // Skip authentication for GET requests in development
    console.log("Development mode: Skipping authentication for GET request");
    next();
  } else {
    // Use normal authentication for other requests
    authenticateToken(req, res, next);
  }
};

router.get("/", optionalAuth, asyncHandler(getProjects));
router.post("/", authenticateToken, asyncHandler(createProject));
router.get("/:id", optionalAuth, asyncHandler(getProject));
router.put("/:id", authenticateToken, asyncHandler(updateProject));
router.delete("/:id", authenticateToken, asyncHandler(removeProject));
router.patch("/:id/state", authenticateToken, asyncHandler(saveProjectState));

// Update project deployment status (called by Terraform runner - no auth required)
router.post('/:id/deployment-status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { deploymentStatus, deploymentOutputs, lastDeployed } = req.body;
  
  console.log(`[Project] Updating deployment status for project ${id}: ${deploymentStatus}`);
  
  try {
    const project = await getProjectById(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    
    // Update deployment status
    project.deploymentStatus = deploymentStatus;
    if (deploymentOutputs) {
      project.deploymentOutputs = deploymentOutputs;
    }
    if (lastDeployed) {
      project.lastDeployed = new Date(lastDeployed);
    }
    
    await saveProject(project);
    
    console.log(`[Project] Successfully updated project ${id} deployment status to ${deploymentStatus}`);
    res.json({ success: true, message: "Deployment status updated" });
    
  } catch (error: any) {
    console.error(`[Project] Error updating deployment status for project ${id}:`, error);
    res.status(500).json({ error: error.message || "Failed to update deployment status" });
  }
}));

export default router;
