"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const openAIController_1 = require("../controllers/openAIController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
console.log("In IAC");
// Generate Infrastructure as Code (IaC)
router.post("/", (0, asyncHandler_1.default)(openAIController_1.generateIaC));
// Generate Application Code
router.post("/app", (0, asyncHandler_1.default)(openAIController_1.generateApplicationCode));
exports.default = router;
