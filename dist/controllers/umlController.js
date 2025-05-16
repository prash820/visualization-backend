"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUmlDiagrams = void 0;
const projectFileStore_1 = require("../utils/projectFileStore");
const umlGenerator_1 = require("../utils/umlGenerator");
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const generateUmlDiagrams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, projectId } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    try {
        const diagrams = yield (0, umlGenerator_1.generateUmlFromPrompt)(prompt);
        const project = yield (0, projectFileStore_1.getProjectById)(projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        project.umlDiagrams = diagrams;
        yield (0, projectFileStore_1.saveProject)(project);
        res.json({
            id: project._id,
            projectId: project._id,
            diagrams: project.umlDiagrams,
            prompt: prompt,
            updatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error generating UML diagrams:', error);
        res.status(500).json({ error: 'Failed to generate UML diagrams' });
    }
});
exports.generateUmlDiagrams = generateUmlDiagrams;
// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 
