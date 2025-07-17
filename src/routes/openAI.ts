import express from "express";
import { generateVisualization, getDiagramJobStatus } from "../controllers/openAIController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// Generate visualization endpoint
router.post("/", asyncHandler(generateVisualization));

// Get diagram job status endpoint
router.get("/diagram-job-status/:jobId", asyncHandler(getDiagramJobStatus));

export default router;