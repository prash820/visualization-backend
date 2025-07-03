"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const magicController_1 = require("../controllers/magicController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// 🔍 Step 1: Generate concept and diagrams for validation
router.post("/generate-concept", (0, asyncHandler_1.default)(magicController_1.generateConceptForValidation));
// 📊 Get concept generation status  
router.get("/concept-status/:jobId", (0, asyncHandler_1.default)(magicController_1.getConceptStatus));
// 🚀 Step 2: User approves concept, build the actual app
router.post("/approve-and-build", (0, asyncHandler_1.default)(magicController_1.approveConceptAndBuild));
// 📊 Get app creation status
router.get("/build-status/:jobId", (0, asyncHandler_1.default)(magicController_1.getAppCreationStatus));
// 📊 COMPREHENSIVE RESOURCE MANAGEMENT API
// Get comprehensive overview of all resources with cost and deployment status
router.get("/resources/overview", (0, asyncHandler_1.default)(magicController_1.getResourcesOverview));
// Get resources filtered by category (active, provisioned, failed, orphaned, etc.)
router.get("/resources/category/:category", (0, asyncHandler_1.default)(magicController_1.getResourcesByCategory));
// 🧹 ORPHANED RESOURCES MANAGEMENT
// List all orphaned/abandoned magic workspaces with AWS resources
router.get("/orphaned-resources", (0, asyncHandler_1.default)(magicController_1.listOrphanedResources));
// Get detailed information about a specific workspace
router.get("/workspace/:projectId", (0, asyncHandler_1.default)(magicController_1.getWorkspaceDetails));
// Clean up a specific orphaned workspace
router.delete("/cleanup/:projectId", (0, asyncHandler_1.default)(magicController_1.cleanupOrphanedResource));
// Clean up ALL orphaned resources (dangerous - requires confirmation)
router.post("/cleanup-all", (0, asyncHandler_1.default)(magicController_1.cleanupAllOrphanedResources));
exports.default = router;
