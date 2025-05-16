// src/routes/project.ts
import express from "express";
import { getProjects, createProject, updateProject, removeProject, getProject, saveProjectState } from "../controllers/projectController";
import { authenticateToken } from "../middleware/authMiddleware";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

router.get("/", authenticateToken, asyncHandler(getProjects));
router.post("/", authenticateToken, asyncHandler(createProject));
router.get("/:id", authenticateToken, asyncHandler(getProject));
router.put("/:id", authenticateToken, asyncHandler(updateProject));
router.delete("/:id", authenticateToken, asyncHandler(removeProject));
router.post("/:id/state", authenticateToken, asyncHandler(saveProjectState));

export default router;
