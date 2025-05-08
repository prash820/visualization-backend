"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const documentationController_1 = require("../controllers/documentationController");
const router = express_1.default.Router();
router.post('/generate', async (req, res) => {
    await (0, documentationController_1.generateDocumentation)(req, res);
});
router.post('/generate-high-level', async (req, res) => {
    await (0, documentationController_1.generateHighLevelDocumentation)(req, res);
});
router.post('/generate-low-level', async (req, res) => {
    await (0, documentationController_1.generateLowLevelDocumentation)(req, res);
});
exports.default = router;
//# sourceMappingURL=documentation.js.map