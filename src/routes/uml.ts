import express from "express";
import { generateUmlDiagrams } from "../controllers/umlController";
import { authenticateToken } from "../middleware/authMiddleware";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

router.post("/generate", authenticateToken, asyncHandler(generateUmlDiagrams));

export default router; 