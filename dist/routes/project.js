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
const projectFileStore_1 = require("../utils/projectFileStore");
const router = express_1.default.Router();
// Development mode middleware that skips authentication for GET requests
const optionalAuth = (req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isGetRequest = req.method === 'GET';
    if (isDevelopment && isGetRequest) {
        // Skip authentication for GET requests in development
        console.log("Development mode: Skipping authentication for GET request");
        next();
    }
    else {
        // Use normal authentication for other requests
        (0, authMiddleware_1.authenticateToken)(req, res, next);
    }
};
router.get("/", optionalAuth, (0, asyncHandler_1.default)(projectController_1.getProjects));
router.post("/", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.createProject));
router.get("/:id", optionalAuth, (0, asyncHandler_1.default)(projectController_1.getProject));
router.put("/:id", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.updateProject));
router.delete("/:id", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.removeProject));
router.patch("/:id/state", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.saveProjectState));
// Update project deployment status (called by Terraform runner - no auth required)
router.post('/:id/deployment-status', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { deploymentStatus, deploymentOutputs, lastDeployed } = req.body;
    console.log(`[Project] Updating deployment status for project ${id}: ${deploymentStatus}`);
    try {
        const project = yield (0, projectFileStore_1.getProjectById)(id);
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
        yield (0, projectFileStore_1.saveProject)(project);
        console.log(`[Project] Successfully updated project ${id} deployment status to ${deploymentStatus}`);
        res.json({ success: true, message: "Deployment status updated" });
    }
    catch (error) {
        console.error(`[Project] Error updating deployment status for project ${id}:`, error);
        res.status(500).json({ error: error.message || "Failed to update deployment status" });
    }
})));
exports.default = router;
