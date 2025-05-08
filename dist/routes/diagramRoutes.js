"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const umlController_1 = require("../controllers/umlController");
const architectureController_1 = require("../controllers/architectureController");
const router = express_1.default.Router();
// UML diagram routes
router.post("/uml/generate", umlController_1.generateUmlDiagrams);
// Architecture diagram routes
router.post("/architecture/generate", architectureController_1.generateArchitectureDiagram);
exports.default = router;
