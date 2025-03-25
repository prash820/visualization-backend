import express from "express";
import { deployInfrastructure } from "../controllers/deployController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// 🔹 POST /api/deploy
router.post("/", asyncHandler(deployInfrastructure));

export default router;
