import express from "express";
import { generateIaC } from "../controllers/iacController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// 🔹 Generate Infrastructure as Code (Terraform, AWS CDK, CloudFormation)
router.post("/", asyncHandler(generateIaC));

export default router;
