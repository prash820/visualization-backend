// src/routes/project.ts
import express from "express";

import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  saveProjectState,
  getProjectById
} from "../controllers/projectController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authenticateToken, createProject);
router.get("/", authenticateToken, getProjects);
router.put("/:id", authenticateToken, updateProject);
router.delete("/:id", authenticateToken, deleteProject);
router.patch("/:id/state", authenticateToken, saveProjectState);
router.get("/:id", authenticateToken, getProjectById);


export default router;
