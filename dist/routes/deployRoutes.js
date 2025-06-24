"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const deployController_1 = require("../controllers/deployController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// 🔹 POST /api/deploy - Deploy infrastructure
router.post("/", (0, asyncHandler_1.default)(deployController_1.deployInfrastructure));
// 🔹 GET /api/deploy/job/:jobId - Get infrastructure deployment job status
router.get("/job/:jobId", (0, asyncHandler_1.default)(deployController_1.getDeploymentJobStatus));
// 🔹 POST /api/deploy/destroy - Destroy infrastructure
router.post("/destroy", (0, asyncHandler_1.default)(deployController_1.destroyInfrastructure));
// 🔹 POST /api/deploy/retry - Retry failed infrastructure deployment
router.post("/retry", (0, asyncHandler_1.default)(deployController_1.retryInfrastructureDeployment));
// 🔹 GET /api/deploy/status/:projectId - Get infrastructure status (FIXED ROUTE)
router.get("/status/:projectId", (0, asyncHandler_1.default)(deployController_1.getInfrastructureStatus));
// 🔹 GET /api/deploy/validate/:projectId - Validate Terraform config
router.get("/validate/:projectId", (0, asyncHandler_1.default)(deployController_1.validateTerraformConfig));
// 🔹 GET /api/deploy/costs/:projectId - Estimate infrastructure costs
router.get("/costs/:projectId", (0, asyncHandler_1.default)(deployController_1.estimateInfrastructureCosts));
// 🔹 GET /api/deploy/outputs/:projectId - Get Terraform outputs
router.get("/outputs/:projectId", (0, asyncHandler_1.default)(deployController_1.getTerraformOutputs));
// 🔹 GET /api/deploy/state/:projectId - Get Terraform state
router.get("/state/:projectId", (0, asyncHandler_1.default)(deployController_1.getTerraformState));
// APPLICATION DEPLOYMENT ROUTES
// 🔹 POST /api/deploy/app - Deploy application code
router.post("/app", (0, asyncHandler_1.default)(deployController_1.deployApplicationCode));
// 🔹 POST /api/deploy/app/retry - Retry failed application deployment
router.post("/app/retry", (0, asyncHandler_1.default)(deployController_1.retryApplicationDeployment));
// 🔹 POST /api/deploy/app/purge - Purge application resources (empty S3, reset status)
router.post("/app/purge", (0, asyncHandler_1.default)(deployController_1.purgeApplicationResources));
// 🔹 GET /api/deploy/app/:projectId - Get application deployment status
router.get("/app/:projectId", (0, asyncHandler_1.default)(deployController_1.getApplicationDeploymentStatus));
// 🔹 GET /api/deploy/app/job/:jobId - Get application deployment job status
router.get("/app/job/:jobId", (0, asyncHandler_1.default)(deployController_1.getApplicationDeploymentJobStatus));
exports.default = router;
