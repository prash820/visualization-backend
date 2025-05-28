"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const documentationController_1 = require("../controllers/documentationController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// Generate documentation endpoint
router.post('/generate', (0, asyncHandler_1.default)(documentationController_1.generateDocumentation));
// Get documentation generation status
router.get('/status/:id', (0, asyncHandler_1.default)(documentationController_1.getDocumentationStatus));
// Get documentation for a project
router.get('/project/:projectId', (0, asyncHandler_1.default)(documentationController_1.getProjectDocumentationHandler));
// Delete a documentation (by projectId in query)
router.delete('/', (0, asyncHandler_1.default)(documentationController_1.deleteProjectDocumentationHandler));
exports.default = router;
