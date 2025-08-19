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
// src/routes/project.ts
const express_1 = __importDefault(require("express"));
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const databaseService_1 = require("../services/databaseService");
const router = express_1.default.Router();
// Development mode middleware that skips authentication for development
const optionalAuth = (req, res, next) => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
        // Skip authentication for all requests in development
        console.log("Development mode: Skipping authentication");
        next();
    }
    else {
        // Use normal authentication for production
        (0, authMiddleware_1.authenticateToken)(req, res, next);
    }
};
// Get all projects for a user
router.get("/user/:userId", optionalAuth, (0, asyncHandler_1.default)(projectController_1.getUserProjects));
// Create a new project
router.post("/", optionalAuth, (0, asyncHandler_1.default)(projectController_1.createProject));
// Get a specific project
router.get("/:projectId", optionalAuth, (0, asyncHandler_1.default)(projectController_1.getProject));
// Update a project
router.put("/:projectId", optionalAuth, (0, asyncHandler_1.default)(projectController_1.updateProject));
// Delete a project
router.delete("/:projectId", optionalAuth, (0, asyncHandler_1.default)(projectController_1.deleteProject));
// Archive a project
router.patch("/:projectId/archive", optionalAuth, (0, asyncHandler_1.default)(projectController_1.archiveProject));
// Update project deployment status (called by Terraform runner - no auth required)
router.post('/:projectId/deployment-status', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const { deploymentStatus, deploymentOutputs, lastDeployed } = req.body;
    console.log(`[Project] Updating deployment status for project ${projectId}: ${deploymentStatus}`);
    try {
        const project = databaseService_1.databaseService.getProject(projectId);
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
        databaseService_1.databaseService.saveProject(project);
        console.log(`[Project] Successfully updated project ${projectId} deployment status to ${deploymentStatus}`);
        res.json({ success: true, message: "Deployment status updated" });
    }
    catch (error) {
        console.error(`[Project] Error updating deployment status for project ${projectId}:`, error);
        res.status(500).json({ error: error.message || "Failed to update deployment status" });
    }
})));
exports.default = router;
