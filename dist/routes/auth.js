"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// Login endpoint
router.post("/login", (0, asyncHandler_1.default)(authController_1.loginUser));
// Register endpoint
router.post("/register", (0, asyncHandler_1.default)(authController_1.registerUser));
// Token validation endpoint
router.post("/validate", (0, asyncHandler_1.default)(authController_1.validateToken));
exports.default = router;
