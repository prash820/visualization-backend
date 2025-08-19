import express from "express";
import path from "path";
import fs from "fs/promises";
import {
  createInfrastructure,
  generateIaC,
  generateInfrastructureTiers,
  generateDetailedTier,
  deploySelectedTier,
  getInfrastructureJobStatus,
  getUserInfrastructureJobs,
  deployExistingInfrastructure,
  retryFailedDeployment,
  destroyInfrastructure,
  getProjectById,
  deleteProject
} from "../controllers/iacController";
import { authenticateToken, requireUser } from "../middleware/auth";
import asyncHandler from "../utils/asyncHandler";
import { databaseService } from "../services/databaseService";

const router = express.Router();

// Debug endpoint to check Terraform code for a project (NO AUTH for testing)
router.get("/debug/terraform/:projectId", async (req, res) => {
  const { projectId } = req.params;
  
  try {
    console.log(`[Debug] Checking project: ${projectId}`);
    
    // Very simple response to test
    res.status(200).json({
      projectId,
      message: "Debug endpoint working",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Debug] Error checking project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Main Infrastructure Workflow - Create infrastructure from prompt (REQUIRES AUTH)
router.post("/create", authenticateToken, requireUser, asyncHandler(createInfrastructure));

// 🔹 NEW: Generate infrastructure tiers with cost analysis (REQUIRES AUTH)
router.post("/tiers", authenticateToken, requireUser, asyncHandler(generateInfrastructureTiers));

// 🔹 NEW: Generate detailed infrastructure for selected tier (REQUIRES AUTH)
router.post("/generate-detailed", authenticateToken, requireUser, asyncHandler(generateDetailedTier));

// 🔹 NEW: Deploy selected infrastructure tier (REQUIRES AUTH)
router.post("/deploy-tier", authenticateToken, requireUser, asyncHandler(deploySelectedTier));

// 🔹 Legacy endpoint for backward compatibility (REQUIRES AUTH)
router.post("/generate", authenticateToken, requireUser, asyncHandler(generateIaC));

// 🔹 Get infrastructure job status (REQUIRES AUTH)
router.get("/status/:jobId", authenticateToken, requireUser, asyncHandler(getInfrastructureJobStatus));

// 🔹 Get user's infrastructure jobs (REQUIRES AUTH)
router.get("/user/:userId", authenticateToken, requireUser, asyncHandler(getUserInfrastructureJobs));

// 🔹 Get current user's infrastructure projects (REQUIRES AUTH)
router.get("/user", authenticateToken, requireUser, asyncHandler(getUserInfrastructureJobs));

// 🔹 Deploy existing infrastructure (REQUIRES AUTH)
router.post("/deploy", authenticateToken, requireUser, asyncHandler(deployExistingInfrastructure));

// 🔹 Retry failed deployment (REQUIRES AUTH)
router.post("/retry", authenticateToken, requireUser, asyncHandler(retryFailedDeployment));

router.post("/destroy", authenticateToken, requireUser, asyncHandler(destroyInfrastructure));

// Get single project by ID - O(1) lookup
router.get("/project/:projectId", authenticateToken, requireUser, asyncHandler(getProjectById));

// Delete project (only if not provisioned)
router.delete("/project/:projectId", authenticateToken, requireUser, asyncHandler(deleteProject));

// Health check for terraform-runner service
router.get("/health/terraform-runner", async (req, res) => {
  const terraformRunnerUrl = process.env.TERRAFORM_RUNNER_URL || 'http://localhost:8000';
  
  try {
    console.log(`[Health Check] Checking terraform-runner at: ${terraformRunnerUrl}`);
    const response = await fetch(`${terraformRunnerUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const result = await response.json();
      res.json({ 
        status: 'healthy', 
        terraformRunnerUrl,
        response: result 
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy', 
        terraformRunnerUrl,
        error: `Terraform-runner responded with ${response.status}` 
      });
    }
  } catch (error: any) {
    console.error('[Health Check] Error checking terraform-runner:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      terraformRunnerUrl,
      error: error.message 
    });
  }
});



export default router;
