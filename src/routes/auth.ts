// src/routes/auth.ts
import express from "express";
import { register, login, validateToken, getProfile, logout } from "../controllers/authController";
import { authenticateToken, authRateLimit } from "../middleware/auth";
import asyncHandler from "../utils/asyncHandler";

const router = express.Router();

// Public routes with rate limiting
router.post("/register", authRateLimit, asyncHandler(register));
router.post("/login", (req, res, next) => {
  console.log('[AUTH ROUTE] Login request received:', req.body);
  next();
}, authRateLimit, asyncHandler(login));

// Protected routes
router.get("/validate", authenticateToken, asyncHandler(validateToken));
router.get("/profile", authenticateToken, asyncHandler(getProfile));
router.post("/logout", authenticateToken, asyncHandler(logout));

export default router;
