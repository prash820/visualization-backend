import express from "express";
import { generateVisualization } from "../controllers/openAIController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// Generate visualization endpoint
router.post("/", asyncHandler(generateVisualization));

export default router;