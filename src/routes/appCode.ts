import express from "express";
import asyncHandler from "../utils/asyncHandler";
import { generateApplicationCode, getCodeGenerationLogs, streamCodeGenerationLogs, generateAppCodeForProject } from "../controllers/appCodeController";

const router = express.Router();

// POST /api/generate-app-code
router.post("/", asyncHandler(generateApplicationCode));

// POST /api/generate-app-code/generate-for-project/:projectId
router.post("/generate-for-project/:projectId", asyncHandler(generateAppCodeForProject));

// GET /api/generate-app-code/logs/:jobId
router.get("/logs/:jobId", asyncHandler(getCodeGenerationLogs));

// GET /api/generate-app-code/stream/:jobId
router.get("/stream/:jobId", asyncHandler(streamCodeGenerationLogs));

export default router; 