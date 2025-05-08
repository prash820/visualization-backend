"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const deployController_1 = require("../controllers/deployController");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
router.post("/", (0, asyncHandler_1.default)(deployController_1.deployInfrastructure));
exports.default = router;
//# sourceMappingURL=deployRoutes.js.map