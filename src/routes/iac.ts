import express from "express";
import { generateIaC } from "../controllers/openAIController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();
console.log("In IAC");
// Generate Infrastructure as Code (IaC)
router.post("/", asyncHandler(generateIaC));

export default router;
