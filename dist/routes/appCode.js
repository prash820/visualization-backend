"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const appCodeController_1 = require("../controllers/appCodeController");
const router = express_1.default.Router();
// POST /api/generate-app-code
router.post("/", (0, asyncHandler_1.default)(appCodeController_1.generateApplicationCode));
// POST /api/generate-app-code/generate-for-project/:projectId
router.post("/generate-for-project/:projectId", (0, asyncHandler_1.default)(appCodeController_1.generateAppCodeForProject));
// GET /api/generate-app-code/logs/:jobId
router.get("/logs/:jobId", (0, asyncHandler_1.default)(appCodeController_1.getCodeGenerationLogs));
// GET /api/generate-app-code/stream/:jobId
router.get("/stream/:jobId", (0, asyncHandler_1.default)(appCodeController_1.streamCodeGenerationLogs));
exports.default = router;
