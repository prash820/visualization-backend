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
exports.getUmlJobStatus = exports.generateUmlDiagrams = void 0;
const projectFileStore_1 = require("../utils/projectFileStore");
const umlGenerator_1 = require("../utils/umlGenerator");
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
// In-memory job store for UML jobs
const umlJobs = {};
function generateJobId() {
    return `uml-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
const generateUmlDiagrams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, projectId } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    const jobId = generateJobId();
    umlJobs[jobId] = { status: "pending", progress: 0 };
    processUmlJob(jobId, prompt, projectId);
    res.json({ jobId, status: "accepted" });
});
exports.generateUmlDiagrams = generateUmlDiagrams;
function processUmlJob(jobId, prompt, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            umlJobs[jobId] = { status: "processing", progress: 10 };
            const aiResponse = yield (0, umlGenerator_1.generateUmlFromPrompt)(prompt);
            umlJobs[jobId].progress = 60;
            // Save to project if projectId is provided
            if (projectId) {
                const project = yield (0, projectFileStore_1.getProjectById)(projectId);
                if (project) {
                    project.umlDiagrams = aiResponse;
                    yield (0, projectFileStore_1.saveProject)(project);
                }
            }
            umlJobs[jobId] = { status: "completed", progress: 100, result: aiResponse };
        }
        catch (error) {
            umlJobs[jobId] = { status: "failed", progress: 100, error: error.message || "Unknown error" };
        }
    });
}
const getUmlJobStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !umlJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    res.json(umlJobs[jobId]);
});
exports.getUmlJobStatus = getUmlJobStatus;
// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 
