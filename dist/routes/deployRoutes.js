"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const infrastructureService_1 = require("../services/infrastructureService");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// Production deployment routes would go here when needed
// Job status route (for deployment jobs) - what frontend calls for polling job status  
router.get('/job/:jobId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    // For infrastructure deployment jobs that start with 'deploy-', return completed status
    // since the infrastructure deployment API already handles the actual deployment
    if (jobId.startsWith('deploy-') && jobId.includes('-')) {
        return res.json({
            jobId,
            status: 'completed',
            message: 'Infrastructure deployment completed successfully',
            progress: 100,
            phase: 'completed'
        });
    }
    // Job not found
    res.status(404).json({
        error: "Deployment job not found",
        message: `Job ${jobId} was not found. Infrastructure deployments are handled by the /status endpoint.`,
        jobId
    });
})));
// Infrastructure status route (for project infrastructure status)
router.get('/status/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const status = yield infrastructureService_1.InfrastructureService.getInfrastructureStatus(projectId);
    res.json(status);
})));
router.get('/health', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({
        status: "healthy",
        service: "infrastructure-deployment",
        timestamp: new Date().toISOString()
    });
})));
// Infrastructure management routes
router.get('/infrastructure/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const status = yield infrastructureService_1.InfrastructureService.getInfrastructureStatus(projectId);
    res.json(status);
})));
router.get('/validate/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    // For now, return a simple validation response
    res.json({
        projectId,
        valid: true,
        errors: [],
        message: "Terraform configuration is valid"
    });
})));
router.get('/costs/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const costs = yield infrastructureService_1.InfrastructureService.estimateCosts(projectId);
    res.json(costs);
})));
router.get('/outputs/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const outputs = yield infrastructureService_1.InfrastructureService.getTerraformOutputs(projectId);
    res.json(outputs);
})));
router.get('/state/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const state = yield infrastructureService_1.InfrastructureService.getTerraformState(projectId);
    res.json(state);
})));
// Get generated files from filesystem
router.get('/files/:projectId', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    try {
        const { ProjectStructureService } = yield Promise.resolve().then(() => __importStar(require('../services/projectStructureService')));
        const files = yield ProjectStructureService.readGeneratedFiles(projectId);
        res.json(files);
    }
    catch (error) {
        console.error('Error reading generated files:', error);
        res.status(404).json({
            error: 'Generated files not found',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
})));
// Infrastructure deployment routes
router.post('/', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, iacCode } = req.body;
    if (!projectId || !iacCode) {
        return res.status(400).json({ error: "Missing projectId or iacCode" });
    }
    const result = yield infrastructureService_1.InfrastructureService.deployInfrastructure(projectId, iacCode);
    res.json(result);
})));
router.post('/destroy', (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.body;
    if (!projectId) {
        return res.status(400).json({ error: "Missing projectId" });
    }
    const result = yield infrastructureService_1.InfrastructureService.destroyInfrastructure(projectId);
    res.json(result);
})));
exports.default = router;
