"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const iacController_1 = require("../controllers/iacController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
// 🔹 Generate Infrastructure as Code (Terraform, AWS CDK, CloudFormation)
router.post("/", (0, asyncHandler_1.default)(iacController_1.generateIaC));
exports.default = router;
