"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/project.ts
const express_1 = __importDefault(require("express"));
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
router.get("/", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.getProjects));
router.post("/", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.createProject));
router.get("/:id", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.getProject));
router.put("/:id", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.updateProject));
router.delete("/:id", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.removeProject));
router.post("/:id/state", authMiddleware_1.authenticateToken, (0, asyncHandler_1.default)(projectController_1.saveProjectState));
exports.default = router;
