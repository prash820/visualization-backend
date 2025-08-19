"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// Public routes with rate limiting
router.post("/register", auth_1.authRateLimit, (0, asyncHandler_1.default)(authController_1.register));
router.post("/login", (req, res, next) => {
    console.log('[AUTH ROUTE] Login request received:', req.body);
    next();
}, auth_1.authRateLimit, (0, asyncHandler_1.default)(authController_1.login));
// Protected routes
router.get("/validate", auth_1.authenticateToken, (0, asyncHandler_1.default)(authController_1.validateToken));
router.get("/profile", auth_1.authenticateToken, (0, asyncHandler_1.default)(authController_1.getProfile));
router.post("/logout", auth_1.authenticateToken, (0, asyncHandler_1.default)(authController_1.logout));
exports.default = router;
