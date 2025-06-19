import express from "express";
import { generateUmlDiagrams, getUmlJobStatus } from "../controllers/umlController";
import { authenticateToken } from "../middleware/authMiddleware";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

router.post("/generate", authenticateToken, asyncHandler(generateUmlDiagrams));

// Poll UML job status
router.get("/status/:jobId", asyncHandler(getUmlJobStatus));

export default router; 