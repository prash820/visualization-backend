import express from "express";
import { 
  generateConceptForValidation, 
  approveConceptAndBuild,
  getConceptStatus,
  getAppCreationStatus,
  listOrphanedResources,
  cleanupOrphanedResource,
  cleanupAllOrphanedResources,
  getWorkspaceDetails,
  getResourcesOverview,
  getResourcesByCategory
} from "../controllers/magicController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// 🔍 Step 1: Generate concept and diagrams for validation
router.post("/generate-concept", asyncHandler(generateConceptForValidation));

// 📊 Get concept generation status  
router.get("/concept-status/:jobId", asyncHandler(getConceptStatus));

// 🚀 Step 2: User approves concept, build the actual app
router.post("/approve-and-build", asyncHandler(approveConceptAndBuild));

// 📊 Get app creation status
router.get("/build-status/:jobId", asyncHandler(getAppCreationStatus));

// 📊 COMPREHENSIVE RESOURCE MANAGEMENT API
// Get comprehensive overview of all resources with cost and deployment status
router.get("/resources/overview", asyncHandler(getResourcesOverview));

// Get resources filtered by category (active, provisioned, failed, orphaned, etc.)
router.get("/resources/category/:category", asyncHandler(getResourcesByCategory));

// 🧹 ORPHANED RESOURCES MANAGEMENT
// List all orphaned/abandoned magic workspaces with AWS resources
router.get("/orphaned-resources", asyncHandler(listOrphanedResources));

// Get detailed information about a specific workspace
router.get("/workspace/:projectId", asyncHandler(getWorkspaceDetails));

// Clean up a specific orphaned workspace
router.delete("/cleanup/:projectId", asyncHandler(cleanupOrphanedResource));

// Clean up ALL orphaned resources (dangerous - requires confirmation)
router.post("/cleanup-all", asyncHandler(cleanupAllOrphanedResources));

export default router; 