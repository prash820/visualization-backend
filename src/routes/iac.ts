import express from "express";
import { generateIaC, getIaCJobStatus } from "../controllers/iacController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();
console.log("In IAC");
// Generate Infrastructure as Code (IaC)
router.post("/", asyncHandler(generateIaC));

// Poll IaC job status
router.get("/status/:jobId", asyncHandler(getIaCJobStatus));

export default router;
