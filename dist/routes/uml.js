"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const umlController_1 = require("../controllers/umlController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
router.post("/generate", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(umlController_1.generateUmlDiagrams));
exports.default = router;
