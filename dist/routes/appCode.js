"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const appCodeController_1 = require("../controllers/appCodeController");
const router = express_1.default.Router();
const appCodeController = new appCodeController_1.AppCodeController();
/**
 * Convert app-code.json to folder structure
 * POST /api/app-code/convert
 */
router.post('/convert', appCodeController.convertAppCode.bind(appCodeController));
/**
 * Validate generated code
 * POST /api/app-code/validate
 */
router.post('/validate', appCodeController.validateGeneratedCode.bind(appCodeController));
/**
 * Get project structure
 * GET /api/app-code/structure/:projectId
 */
router.get('/structure/:projectId', appCodeController.getProjectStructure.bind(appCodeController));
/**
 * Deploy project
 * POST /api/app-code/deploy
 */
router.post('/deploy', appCodeController.deployProject.bind(appCodeController));
exports.default = router;
