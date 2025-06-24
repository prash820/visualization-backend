import express from "express";
import { 
  deployInfrastructure, 
  getDeploymentJobStatus, 
  destroyInfrastructure, 
  getInfrastructureStatus,
  validateTerraformConfig,
  estimateInfrastructureCosts,
  getTerraformOutputs,
  getTerraformState,
  retryInfrastructureDeployment,
  deployApplicationCode,
  getApplicationDeploymentStatus,
  getApplicationDeploymentJobStatus,
  retryApplicationDeployment,
  purgeApplicationResources
} from "../controllers/deployController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// 🔹 POST /api/deploy - Deploy infrastructure
router.post("/", asyncHandler(deployInfrastructure));

// 🔹 GET /api/deploy/job/:jobId - Get infrastructure deployment job status
router.get("/job/:jobId", asyncHandler(getDeploymentJobStatus));

// 🔹 POST /api/deploy/destroy - Destroy infrastructure
router.post("/destroy", asyncHandler(destroyInfrastructure));

// 🔹 POST /api/deploy/retry - Retry failed infrastructure deployment
router.post("/retry", asyncHandler(retryInfrastructureDeployment));

// 🔹 GET /api/deploy/status/:projectId - Get infrastructure status (FIXED ROUTE)
router.get("/status/:projectId", asyncHandler(getInfrastructureStatus));

// 🔹 GET /api/deploy/validate/:projectId - Validate Terraform config
router.get("/validate/:projectId", asyncHandler(validateTerraformConfig));

// 🔹 GET /api/deploy/costs/:projectId - Estimate infrastructure costs
router.get("/costs/:projectId", asyncHandler(estimateInfrastructureCosts));

// 🔹 GET /api/deploy/outputs/:projectId - Get Terraform outputs
router.get("/outputs/:projectId", asyncHandler(getTerraformOutputs));

// 🔹 GET /api/deploy/state/:projectId - Get Terraform state
router.get("/state/:projectId", asyncHandler(getTerraformState));

// APPLICATION DEPLOYMENT ROUTES
// 🔹 POST /api/deploy/app - Deploy application code
router.post("/app", asyncHandler(deployApplicationCode));

// 🔹 POST /api/deploy/app/retry - Retry failed application deployment
router.post("/app/retry", asyncHandler(retryApplicationDeployment));

// 🔹 POST /api/deploy/app/purge - Purge application resources (empty S3, reset status)
router.post("/app/purge", asyncHandler(purgeApplicationResources));

// 🔹 GET /api/deploy/app/:projectId - Get application deployment status
router.get("/app/:projectId", asyncHandler(getApplicationDeploymentStatus));

// 🔹 GET /api/deploy/app/job/:jobId - Get application deployment job status
router.get("/app/job/:jobId", asyncHandler(getApplicationDeploymentJobStatus));

export default router;
