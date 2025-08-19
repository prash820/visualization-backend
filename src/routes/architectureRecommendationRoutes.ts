import express from "express";
import { 
  generateArchitectureRecommendations,
  getArchitectureRecommendationJobStatus,
  getAllArchitectureRecommendationJobs,
  selectArchitectureOption
} from "../controllers/architectureRecommendationController";
import { authenticateToken, requireUser } from "../middleware/auth";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// 🔹 Generate Smart Cloud Architect recommendations (REQUIRES AUTH)
router.post("/generate", authenticateToken, requireUser, asyncHandler(generateArchitectureRecommendations));

// 🔹 Get architecture recommendation job status (REQUIRES AUTH)
router.get("/status/:jobId", authenticateToken, requireUser, asyncHandler(getArchitectureRecommendationJobStatus));

// 🔹 Get all architecture recommendation jobs (REQUIRES AUTH)
router.get("/jobs", authenticateToken, requireUser, asyncHandler(getAllArchitectureRecommendationJobs));

// 🔹 Select architecture option (REQUIRES AUTH)
router.post("/select/:jobId", authenticateToken, requireUser, asyncHandler(selectArchitectureOption));

export default router; 