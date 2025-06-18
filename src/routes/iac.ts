import express from "express";
import { generateIaC, generateApplicationCode, getIaCJobStatus } from "../controllers/openAIController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();
console.log("In IAC");
// Generate Infrastructure as Code (IaC)
router.post("/", asyncHandler(generateIaC));

// Poll IaC job status
router.get("/status/:jobId", asyncHandler(getIaCJobStatus));

// Generate Application Code
router.post("/app", asyncHandler(generateApplicationCode));

export default router;
