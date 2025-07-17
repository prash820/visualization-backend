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
exports.getUmlJobsHealth = exports.getUmlJobStatus = exports.generateUmlDiagrams = void 0;
const projectFileStore_1 = require("../utils/projectFileStore");
const umlGenerator_1 = require("../utils/umlGenerator");
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const memoryManager_1 = require("../utils/memoryManager");
const aiProvider_1 = require("../config/aiProvider");
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const umlJobs = {};
// Set up memory management for job stores - increased retention time
memoryManager_1.memoryManager.setupJobStoreCleanup(umlJobs, "umlJobs", 60 * 60 * 1000, 100); // 60 min, max 100 jobs
function generateJobId() {
    return `uml-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
// Rate limiting and retry logic
function makeAIRequestWithRetry(prompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, maxRetries = 3) {
        var _a, _b;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[UML] AI request attempt ${attempt}/${maxRetries}`);
                // Try OpenAI first
                if (process.env.OPENAI_API_KEY) {
                    try {
                        const response = yield (0, umlGenerator_1.generateUmlFromPrompt)(prompt);
                        console.log(`[UML] OpenAI request successful on attempt ${attempt}`);
                        return response;
                    }
                    catch (error) {
                        console.log(`[UML] OpenAI failed on attempt ${attempt}:`, error.message);
                        // If it's a rate limit error, try Anthropic
                        if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('429')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('quota'))) {
                            console.log(`[UML] Rate limit detected, trying Anthropic...`);
                            return yield makeAnthropicRequest(prompt);
                        }
                        lastError = error;
                    }
                }
                // Fallback to Anthropic
                if (process.env.ANTHROPIC_SECRET_KEY) {
                    try {
                        const response = yield makeAnthropicRequest(prompt);
                        console.log(`[UML] Anthropic request successful on attempt ${attempt}`);
                        return response;
                    }
                    catch (error) {
                        console.log(`[UML] Anthropic failed on attempt ${attempt}:`, error.message);
                        lastError = error;
                    }
                }
                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.log(`[UML] Waiting ${delay}ms before retry...`);
                    yield new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            catch (error) {
                console.error(`[UML] Unexpected error on attempt ${attempt}:`, error);
                lastError = error;
            }
        }
        throw lastError || new Error("All AI providers failed after retries");
    });
}
function makeAnthropicRequest(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = `You are an expert software architect and UML diagram generator. Generate comprehensive UML diagrams based on the user's requirements.

Return a JSON object with the following UML diagram types:
{
  "componentDiagram": "PlantUML component diagram code",
  "classDiagram": "PlantUML class diagram code", 
  "sequenceDiagram": "PlantUML sequence diagram code",
  "useCaseDiagram": "PlantUML use case diagram code"
}

Generate PlantUML code for each diagram type. Use proper PlantUML syntax:
- Start with @startuml and end with @enduml
- Use appropriate PlantUML elements and relationships
- Include meaningful names and relationships
- Make diagrams comprehensive and professional

Focus on creating diagrams that clearly show:
1. Component relationships and dependencies
2. Class structure with methods and attributes
3. Sequence of operations and interactions
4. Use cases and actors

Return ONLY the JSON object, no explanations.`;
        const response = yield aiProvider_1.anthropic.messages.create({
            model: aiProvider_1.ANTHROPIC_MODEL,
            max_tokens: 4000,
            temperature: 0.3,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }]
        });
        const content = response.content[0];
        if (content.type === 'text') {
            return JSON.parse(content.text);
        }
        throw new Error("Invalid response format from Anthropic");
    });
}
const generateUmlDiagrams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, projectId } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    const jobId = generateJobId();
    console.log(`[UML] Starting job ${jobId} for prompt: ${prompt.substring(0, 100)}...`);
    umlJobs[jobId] = {
        status: "pending",
        progress: 0,
        startTime: new Date(),
        lastAccessed: new Date(),
        retryCount: 0
    };
    // Start processing in background
    processUmlJob(jobId, prompt, projectId);
    res.json({ jobId, status: "accepted" });
});
exports.generateUmlDiagrams = generateUmlDiagrams;
function processUmlJob(jobId, prompt, projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[UML] Processing job ${jobId}`);
            umlJobs[jobId] = Object.assign(Object.assign({}, umlJobs[jobId]), { status: "processing", progress: 10, lastAccessed: new Date() });
            // Make AI request with retry logic
            const aiResponse = yield makeAIRequestWithRetry(prompt);
            umlJobs[jobId].progress = 60;
            umlJobs[jobId].lastAccessed = new Date();
            console.log(`[UML] AI response received for job ${jobId}`);
            // Save to project if projectId is provided
            if (projectId) {
                try {
                    const project = yield (0, projectFileStore_1.getProjectById)(projectId);
                    if (project) {
                        project.umlDiagrams = aiResponse;
                        yield (0, projectFileStore_1.saveProject)(project);
                        console.log(`[UML] Saved to project ${projectId}`);
                    }
                }
                catch (error) {
                    console.error(`[UML] Error saving to project ${projectId}:`, error);
                    // Don't fail the job if project save fails
                }
            }
            umlJobs[jobId] = Object.assign(Object.assign({}, umlJobs[jobId]), { status: "completed", progress: 100, result: aiResponse, endTime: new Date(), lastAccessed: new Date() });
            console.log(`[UML] Job ${jobId} completed successfully`);
        }
        catch (error) {
            console.error(`[UML] Job ${jobId} failed:`, error);
            umlJobs[jobId] = Object.assign(Object.assign({}, umlJobs[jobId]), { status: "failed", progress: 100, error: error.message || "Unknown error", endTime: new Date(), lastAccessed: new Date() });
        }
    });
}
const getUmlJobStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    console.log(`[UML] Checking status for job ${jobId}`);
    console.log(`[UML] Available jobs:`, Object.keys(umlJobs));
    if (!jobId || !umlJobs[jobId]) {
        console.log(`[UML] Job ${jobId} not found`);
        res.status(404).json({ error: "Job not found" });
        return;
    }
    // Update access time for memory management
    memoryManager_1.memoryManager.touchJob(umlJobs[jobId]);
    console.log(`[UML] Job ${jobId} status: ${umlJobs[jobId].status}`);
    res.json(umlJobs[jobId]);
});
exports.getUmlJobStatus = getUmlJobStatus;
// Health check for UML jobs
const getUmlJobsHealth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobCount = Object.keys(umlJobs).length;
    const jobStatuses = Object.values(umlJobs).reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
    }, {});
    res.json({
        totalJobs: jobCount,
        jobStatuses,
        recentJobs: Object.entries(umlJobs)
            .sort(([, a], [, b]) => { var _a, _b; return (((_a = b.startTime) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) - (((_b = a.startTime) === null || _b === void 0 ? void 0 : _b.getTime()) || 0); })
            .slice(0, 10)
            .map(([id, job]) => ({
            id,
            status: job.status,
            progress: job.progress,
            startTime: job.startTime,
            endTime: job.endTime
        }))
    });
});
exports.getUmlJobsHealth = getUmlJobsHealth;
// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 
