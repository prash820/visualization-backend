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
exports.getDiagramJobStatus = exports.generateVisualization = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const aiProvider_1 = require("../config/aiProvider");
const memoryManager_1 = require("../utils/memoryManager");
dotenv_1.default.config();
const diagramJobs = {};
// Set up memory management for job stores
memoryManager_1.memoryManager.setupJobStoreCleanup(diagramJobs, "diagramJobs", 20 * 60 * 1000, 50); // 20 min, max 50 jobs
const generateVisualization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, diagramType } = req.body;
    if (!prompt || !diagramType) {
        return res.status(400).json({ error: "Missing required parameters." });
    }
    const jobId = generateJobId();
    diagramJobs[jobId] = {
        status: "pending",
        progress: 0,
        startTime: new Date(),
        lastAccessed: new Date()
    };
    processDiagramJob(jobId, prompt, diagramType);
    res.json({ jobId, status: "accepted" });
});
exports.generateVisualization = generateVisualization;
function processDiagramJob(jobId, prompt, diagramType) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            diagramJobs[jobId] = Object.assign(Object.assign({}, diagramJobs[jobId]), { status: "processing", progress: 10, lastAccessed: new Date() });
            const systemPrompt = {
                flowchart: `You are an AI assistant specialized in generating flowcharts based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nEach node should have an "id", "label", "role", and a default position.\nEach edge should connect nodes using "sourceLabel", "targetLabel" and edge label that says what is happening between steps.\nRole means the type of node, like start/end, process, decision, input output, etc\nDo not include any extra text.`,
                architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nEach node represents a cloud service or component (with a "label"), and edges represent connections between services.\nFormat example: { "nodes": [{ "label": "Service Name" }], "edges": [{ "sourceLabel": "Service", "targetLabel": "Service", "label": "Connection" }] }\nDo not include any extra text.`,
                sequence: `You are an AI assistant specialized in generating sequence diagrams based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nNodes represent actors or steps, and edges represent the flow of interactions.\nFormat example: { "nodes": [{ "label": "Actor or Step" }], "edges": [{ "sourceLabel": "Label", "targetLabel": "Label", "label": "Message" }] }\nDo not include any extra text.`,
                uml: `You are an AI assistant specialized in generating UML class diagrams based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nEach node represents a class (with a "label"), and edges represent relationships between classes.\nFormat example: { "nodes": [{ "label": "ClassName" }], "edges": [{ "sourceLabel": "ClassName", "targetLabel": "ClassName", "label": "Relationship" }] }\nDo not include any extra text.`
            };
            diagramJobs[jobId].progress = 20;
            // Use OpenAI GPT-4o as primary, Anthropic Claude as fallback
            let response;
            try {
                // Try OpenAI first
                response = yield aiProvider_1.openai.chat.completions.create({
                    model: aiProvider_1.OPENAI_MODEL,
                    max_tokens: 4096,
                    temperature: 0.5,
                    messages: [
                        { role: "user", content: `${systemPrompt[diagramType]}\n\nUser prompt: ${prompt}` }
                    ]
                });
                console.log(`[Diagram] OpenAI request successful for jobId=${jobId}`);
            }
            catch (openaiError) {
                console.log(`[Diagram] OpenAI failed for jobId=${jobId}, trying Anthropic:`, openaiError);
                // Fallback to Anthropic
                response = yield aiProvider_1.anthropic.messages.create({
                    model: aiProvider_1.ANTHROPIC_MODEL,
                    max_tokens: 4096,
                    temperature: 0.5,
                    messages: [
                        { role: "user", content: `${systemPrompt[diagramType]}\n\nUser prompt: ${prompt}` }
                    ]
                });
                console.log(`[Diagram] Anthropic fallback successful for jobId=${jobId}`);
            }
            diagramJobs[jobId].progress = 60;
            // Handle response based on provider
            let fullResponse;
            if ('choices' in response) {
                // OpenAI response
                fullResponse = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            }
            else {
                // Anthropic response
                fullResponse = ((_c = response.content[0]) === null || _c === void 0 ? void 0 : _c.type) === 'text' ? response.content[0].text : "";
            }
            let parsedData;
            if (diagramType === "architecture") {
                parsedData = parseArchitectureResponse(fullResponse);
            }
            else {
                parsedData = parseGenericResponse(fullResponse);
            }
            diagramJobs[jobId] = Object.assign(Object.assign({}, diagramJobs[jobId]), { status: "completed", progress: 100, result: parsedData, endTime: new Date(), lastAccessed: new Date() });
        }
        catch (error) {
            diagramJobs[jobId] = Object.assign(Object.assign({}, diagramJobs[jobId]), { status: "failed", progress: 100, error: error.message || "Unknown error", endTime: new Date(), lastAccessed: new Date() });
        }
    });
}
const getDiagramJobStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !diagramJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    // Update access time for memory management
    memoryManager_1.memoryManager.touchJob(diagramJobs[jobId]);
    res.json(diagramJobs[jobId]);
});
exports.getDiagramJobStatus = getDiagramJobStatus;
function generateJobId() {
    return `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
const parseArchitectureResponse = (response) => {
    try {
        const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedResponse);
        return {
            nodes: parsed.nodes || [],
            edges: parsed.edges || [],
            groups: parsed.groups || []
        };
    }
    catch (error) {
        console.error('Error parsing architecture response:', error);
        return { nodes: [], edges: [], groups: [] };
    }
};
const parseGenericResponse = (response) => {
    try {
        const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanedResponse);
    }
    catch (error) {
        console.error('Error parsing generic response:', error);
        return { nodes: [], edges: [] };
    }
};
