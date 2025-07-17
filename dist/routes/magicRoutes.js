"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const magicController_1 = require("../controllers/magicController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// 🔍 PHASE 1: Start Magic Flow - Idea Analysis
// User provides app idea + target customers, AI analyzes comprehensively
router.post("/start", (0, asyncHandler_1.default)(magicController_1.startMagicFlow));
// 🔄 BACKWARD COMPATIBILITY: Old endpoint name
router.post("/generate-concept", (0, asyncHandler_1.default)(magicController_1.startMagicFlow));
// 📊 Get concept analysis status
router.get("/concept-status/:jobId", (0, asyncHandler_1.default)(magicController_1.getConceptStatus));
// ✅ PHASE 2: User Confirmation/Rejection
// User reviews analysis and either confirms to proceed or rejects to restart
router.post("/confirm", (0, asyncHandler_1.default)(magicController_1.handleUserConfirmation));
// 🔄 BACKWARD COMPATIBILITY: Old endpoint name
router.post("/approve-and-build", (0, asyncHandler_1.default)(magicController_1.handleUserConfirmation));
// 📊 Get build status (covers phases 3-5: UML → Infra → App Code)
router.get("/build-status/:jobId", (0, asyncHandler_1.default)(magicController_1.getBuildStatus));
// 🔧 FAIL-SAFE: Retrigger Infrastructure Generation
// Allows regenerating infrastructure code when there are issues
router.post("/retrigger-infra/:jobId", (0, asyncHandler_1.default)(magicController_1.retriggerInfraGeneration));
// 🔄 FAIL-SAFE: Restart from Specific Phase  
// Allows restarting the magic flow from a specific phase (UML, infra, or app generation)
router.post("/restart-from-phase/:jobId", (0, asyncHandler_1.default)(magicController_1.restartFromPhase));
// 📊 Infrastructure Status Check
// Get detailed status of infrastructure generation phase
router.get("/infrastructure-status/:jobId", (0, asyncHandler_1.default)(magicController_1.getInfrastructureStatus));
// 🚀 PHASE 6: Infrastructure Provisioning (Manual Trigger)
// User manually triggers infrastructure provisioning when ready
router.post("/provision/:jobId", (0, asyncHandler_1.default)(magicController_1.provisionInfrastructure));
// 📊 Health check for magic flow
router.get("/health", (0, asyncHandler_1.default)(magicController_1.getMagicHealth));
exports.default = router;
