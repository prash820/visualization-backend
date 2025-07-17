import express from "express";
import { 
  startMagicFlow,
  handleUserConfirmation, 
  provisionInfrastructure,
  getConceptStatus,
  getBuildStatus,
  getMagicHealth,
  retriggerInfraGeneration,
  restartFromPhase,
  getInfrastructureStatus
} from "../controllers/magicController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// 🔍 PHASE 1: Start Magic Flow - Idea Analysis
// User provides app idea + target customers, AI analyzes comprehensively
router.post("/start", asyncHandler(startMagicFlow));

// 🔄 BACKWARD COMPATIBILITY: Old endpoint name
router.post("/generate-concept", asyncHandler(startMagicFlow));

// 📊 Get concept analysis status
router.get("/concept-status/:jobId", asyncHandler(getConceptStatus));

// ✅ PHASE 2: User Confirmation/Rejection
// User reviews analysis and either confirms to proceed or rejects to restart
router.post("/confirm", asyncHandler(handleUserConfirmation));

// 🔄 BACKWARD COMPATIBILITY: Old endpoint name
router.post("/approve-and-build", asyncHandler(handleUserConfirmation));

// 📊 Get build status (covers phases 3-5: UML → Infra → App Code)
router.get("/build-status/:jobId", asyncHandler(getBuildStatus));

// 🔧 FAIL-SAFE: Retrigger Infrastructure Generation
// Allows regenerating infrastructure code when there are issues
router.post("/retrigger-infra/:jobId", asyncHandler(retriggerInfraGeneration));

// 🔄 FAIL-SAFE: Restart from Specific Phase  
// Allows restarting the magic flow from a specific phase (UML, infra, or app generation)
router.post("/restart-from-phase/:jobId", asyncHandler(restartFromPhase));

// 📊 Infrastructure Status Check
// Get detailed status of infrastructure generation phase
router.get("/infrastructure-status/:jobId", asyncHandler(getInfrastructureStatus));

// 🚀 PHASE 6: Infrastructure Provisioning (Manual Trigger)
// User manually triggers infrastructure provisioning when ready
router.post("/provision/:jobId", asyncHandler(provisionInfrastructure));

// 📊 Health check for magic flow
router.get("/health", asyncHandler(getMagicHealth));

export default router; 