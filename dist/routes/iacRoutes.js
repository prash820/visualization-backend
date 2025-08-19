"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const iacController_1 = require("../controllers/iacController");
const auth_1 = require("../middleware/auth");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// Debug endpoint to check Terraform code for a project (NO AUTH for testing)
router.get("/debug/terraform/:projectId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    try {
        console.log(`[Debug] Checking project: ${projectId}`);
        // Very simple response to test
        res.status(200).json({
            projectId,
            message: "Debug endpoint working",
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Debug] Error checking project:', error);
        res.status(500).json({ error: error.message });
    }
}));
// 🔹 Main Infrastructure Workflow - Create infrastructure from prompt (REQUIRES AUTH)
router.post("/create", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.createInfrastructure));
// 🔹 NEW: Generate infrastructure tiers with cost analysis (REQUIRES AUTH)
router.post("/tiers", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.generateInfrastructureTiers));
// 🔹 NEW: Generate detailed infrastructure for selected tier (REQUIRES AUTH)
router.post("/generate-detailed", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.generateDetailedTier));
// 🔹 NEW: Deploy selected infrastructure tier (REQUIRES AUTH)
router.post("/deploy-tier", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.deploySelectedTier));
// 🔹 Legacy endpoint for backward compatibility (REQUIRES AUTH)
router.post("/generate", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.generateIaC));
// 🔹 Get infrastructure job status (REQUIRES AUTH)
router.get("/status/:jobId", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.getInfrastructureJobStatus));
// 🔹 Get user's infrastructure jobs (REQUIRES AUTH)
router.get("/user/:userId", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.getUserInfrastructureJobs));
// 🔹 Get current user's infrastructure projects (REQUIRES AUTH)
router.get("/user", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.getUserInfrastructureJobs));
// 🔹 Deploy existing infrastructure (REQUIRES AUTH)
router.post("/deploy", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.deployExistingInfrastructure));
// 🔹 Retry failed deployment (REQUIRES AUTH)
router.post("/retry", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.retryFailedDeployment));
router.post("/destroy", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.destroyInfrastructure));
// Get single project by ID - O(1) lookup
router.get("/project/:projectId", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.getProjectById));
// Delete project (only if not provisioned)
router.delete("/project/:projectId", auth_1.authenticateToken, auth_1.requireUser, (0, asyncHandler_1.default)(iacController_1.deleteProject));
// Health check for terraform-runner service
router.get("/health/terraform-runner", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const terraformRunnerUrl = process.env.TERRAFORM_RUNNER_URL || 'http://localhost:8000';
    try {
        console.log(`[Health Check] Checking terraform-runner at: ${terraformRunnerUrl}`);
        const response = yield fetch(`${terraformRunnerUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (response.ok) {
            const result = yield response.json();
            res.json({
                status: 'healthy',
                terraformRunnerUrl,
                response: result
            });
        }
        else {
            res.status(503).json({
                status: 'unhealthy',
                terraformRunnerUrl,
                error: `Terraform-runner responded with ${response.status}`
            });
        }
    }
    catch (error) {
        console.error('[Health Check] Error checking terraform-runner:', error);
        res.status(503).json({
            status: 'unhealthy',
            terraformRunnerUrl,
            error: error.message
        });
    }
}));
exports.default = router;
