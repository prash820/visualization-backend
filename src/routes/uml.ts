import express from "express";
import { generateUmlDiagrams, getUmlJobStatus, getUmlJobsHealth } from "../controllers/umlController";
import { authenticateToken } from "../middleware/authMiddleware";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

router.post("/generate", authenticateToken, asyncHandler(generateUmlDiagrams));

// Poll UML job status
router.get("/status/:jobId", asyncHandler(getUmlJobStatus));

// Health check for UML jobs (for debugging)
router.get("/health", asyncHandler(getUmlJobsHealth));

export default router; 