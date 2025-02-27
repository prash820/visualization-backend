// src/routes/auth.ts
import express from "express";
import { loginUser, registerUser, validateToken } from "../controllers/authController";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// Login endpoint
router.post("/login", asyncHandler(loginUser));

// Register endpoint
router.post("/register", asyncHandler(registerUser));

// Token validation endpoint
router.post("/validate", asyncHandler(validateToken));

export default router;
