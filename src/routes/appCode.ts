import express from "express";
import asyncHandler from "../utils/asyncHandler";
import { generateApplicationCode } from "../controllers/openAIController";

const router = express.Router();

// POST /api/generate-app-code
router.post("/", asyncHandler(generateApplicationCode));

export default router; 