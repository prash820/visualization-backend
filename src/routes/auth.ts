// src/routes/auth.ts
import express from "express";
import { register, login, validateToken } from "../controllers/authController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// Login endpoint
router.post("/login", asyncHandler(login));

// Register endpoint
router.post("/register", register);

// Token validation endpoint
router.get("/validate-token", validateToken);

export default router;
