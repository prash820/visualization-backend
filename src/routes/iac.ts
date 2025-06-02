import express from "express";
import { generateIaC, generateApplicationCode } from "../controllers/openAIController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();
console.log("In IAC");
// Generate Infrastructure as Code (IaC)
router.post("/", asyncHandler(generateIaC));

// Generate Application Code
router.post("/app", asyncHandler(generateApplicationCode));

export default router;
