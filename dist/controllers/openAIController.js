"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.generateApplicationCode = exports.getIaCJobStatus = exports.generateIaC = exports.getDiagramJobStatus = exports.generateVisualization = void 0;
// src/controllers/openAIController.ts
const express_1 = __importDefault(require("express"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_SECRET_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});
// In-memory job store for diagram jobs
const diagramJobs = {};
const generateVisualization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, diagramType } = req.body;
    if (!prompt || !diagramType) {
        return res.status(400).json({ error: "Missing required parameters." });
    }
    const jobId = generateJobId();
    diagramJobs[jobId] = { status: "pending", progress: 0 };
    processDiagramJob(jobId, prompt, diagramType);
    res.json({ jobId, status: "accepted" });
});
exports.generateVisualization = generateVisualization;
function processDiagramJob(jobId, prompt, diagramType) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            diagramJobs[jobId] = { status: "processing", progress: 10 };
            const systemPrompt = {
                flowchart: `You are an AI assistant specialized in generating flowcharts based on user prompts.\nReturn only valid JSON with two arrays: \"nodes\" and \"edges\".\nEach node should have an \"id\", \"label\", \"role\", and a default position.\nEach edge should connect nodes using \"sourceLabel\", \"targetLabel\" and edge label that says what is happening between steps.\nRole means the type of node, like start/end, process, decision, input output, etc\nDo not include any extra text.`,
                architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.\n...`,
                sequence: `You are an AI assistant specialized in generating sequence diagrams based on user prompts.\nReturn only valid JSON with two arrays: \"nodes\" and \"edges\".\nNodes represent actors or steps, and edges represent the flow of interactions.\nFormat example: { \"nodes\": [{ \"label\": \"Actor or Step\" }], \"edges\": [{ \"sourceLabel\": \"Label\", \"targetLabel\": \"Label\", \"label\": \"Message\" }] }\nDo not include any extra text.`,
                uml: `You are an AI assistant specialized in generating UML class diagrams based on user prompts.\nReturn only valid JSON with two arrays: \"nodes\" and \"edges\".\nEach node represents a class (with a \"label\"), and edges represent relationships between classes.\nFormat example: { \"nodes\": [{ \"label\": \"ClassName\" }], \"edges\": [{ \"sourceLabel\": \"ClassName\", \"targetLabel\": \"ClassName\", \"label\": \"Relationship\" }] }\nDo not include any extra text.`
            };
            diagramJobs[jobId].progress = 20;
            const response = yield openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [
                    { role: "system", content: systemPrompt[diagramType] },
                    { role: "user", content: prompt },
                ],
                max_tokens: 4096,
                temperature: 0.5,
            });
            diagramJobs[jobId].progress = 60;
            const fullResponse = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
            let parsedData;
            if (diagramType === "architecture") {
                parsedData = parseArchitectureResponse(fullResponse);
            }
            else {
                parsedData = parseGenericResponse(fullResponse);
            }
            diagramJobs[jobId] = { status: "completed", progress: 100, result: parsedData };
        }
        catch (error) {
            diagramJobs[jobId] = { status: "failed", progress: 100, error: error.message || "Unknown error" };
        }
    });
}
const getDiagramJobStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !diagramJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    res.json(diagramJobs[jobId]);
});
exports.getDiagramJobStatus = getDiagramJobStatus;
// In-memory job store for IaC jobs
const iacJobs = {};
function generateJobId() {
    return `iac-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
const generateIaC = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, projectId, umlDiagrams } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    const jobId = generateJobId();
    iacJobs[jobId] = { status: "pending", progress: 0 };
    // Start background job
    processIaCJob(jobId, prompt, projectId, umlDiagrams);
    res.json({ jobId, status: "accepted" });
});
exports.generateIaC = generateIaC;
function processIaCJob(jobId, prompt, projectId, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            console.log(`[IaC] Job started: jobId=${jobId}, projectId=${projectId}`);
            console.log(`[IaC] Prompt: ${prompt}`);
            iacJobs[jobId] = { status: "processing", progress: 10 };
            const systemPrompt = `
You are an expert in generating production-ready Terraform code for AWS.

**IMPORTANT RULES:**
1. Always include a top-level terraform block with:
   - required_providers specifying AWS (source: "hashicorp/aws", version: "~> 5.0")
   - required_version set to ">= 1.5.0"
2. Always include a provider "aws" block with a region (default to "us-east-1" if not specified).
3. Always include at least one real AWS resource block (e.g., aws_instance, aws_s3_bucket, etc.).
4. Optionally include variable blocks for any configurable values.
5. Optionally include output blocks for important outputs.
6. All code must be valid Terraform HCL (no JSON, no YAML, no Markdown, no extra text).
7. Do NOT wrap the code in code fences or add any explanations.
8. The code must be ready to pass basic validation for required blocks.
9. **Do NOT reference S3 objects, S3 keys, or Lambda deployment packages that are not provisioned in this Terraform code. Do not assume any pre-existing S3 buckets or files. If you create a Lambda function, use local file references only if the file is included in the same Terraform directory.**
10. This is a greenfield AWS environment: provision everything needed from scratch, and do not assume any pre-existing infrastructure unless absolutely necessary for a minimal working example.

**Example structure:**
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "app_server" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t2.micro"
  tags = {
    Name = "ExampleAppServerInstance"
  }
}

variable "region" {
  description = "AWS region where resources will be deployed."
  type        = string
  default     = "us-east-1"
}

output "instance_ip" {
  value       = aws_instance.app_server.public_ip
  description = "Public IP of the EC2 instance."
}

**Your output must follow this structure and include all required blocks.**
`;
            iacJobs[jobId].progress = 20;
            const response = yield openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: `Generate infrastructure code for the following system:\n\nPrompt: ${prompt}\n\nUML Diagrams:\n${Object.entries(umlDiagrams || {}).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}`
                    },
                ],
                max_tokens: 4096,
                temperature: 0.5,
            });
            iacJobs[jobId].progress = 60;
            const terraformCode = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "";
            console.log(`[IaC] OpenAI raw response for jobId=${jobId}:`, (_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content);
            console.log(`[IaC] Extracted terraformCode length: ${terraformCode.length}`);
            if (!terraformCode) {
                console.error(`[IaC] No Terraform code generated for jobId=${jobId}, projectId=${projectId}`);
            }
            // Save the generated code to a file if projectId is provided
            if (projectId) {
                const projectDir = path_1.default.join(process.cwd(), "terraform-runner/workspace", projectId);
                if (!fs_1.default.existsSync(projectDir)) {
                    fs_1.default.mkdirSync(projectDir, { recursive: true });
                    console.log(`[IaC] Created project directory: ${projectDir}`);
                }
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "terraform.tf"), terraformCode);
                console.log(`[IaC] Saved terraform.tf for projectId=${projectId} at ${projectDir}`);
                try {
                    const { getProjectById, saveProject } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                    const project = yield getProjectById(projectId);
                    if (project) {
                        project.infraCode = terraformCode;
                        yield saveProject(project);
                    }
                }
                catch (err) {
                    console.error("[IaC Backend] Error saving infraCode to project:", err);
                }
            }
            iacJobs[jobId] = { status: "completed", progress: 100, result: { code: terraformCode } };
        }
        catch (error) {
            console.error(`[IaC] Error in processIaCJob for jobId=${jobId}, projectId=${projectId}:`, error);
            iacJobs[jobId] = { status: "failed", progress: 100, error: error.message || "Unknown error" };
        }
    });
}
const getIaCJobStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !iacJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    res.json(iacJobs[jobId]);
});
exports.getIaCJobStatus = getIaCJobStatus;
const parseArchitectureResponse = (response) => {
    try {
        console.log("[AI RAW RESPONSE]:", response);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid JSON format received from AI.");
        }
        const parsedData = JSON.parse(jsonMatch[0]);
        if (!parsedData.nodes || !parsedData.edges || !parsedData.groups) {
            throw new Error("Missing required keys (nodes, edges, groups) in AI response.");
        }
        // ✅ Ensure every node has a valid group
        parsedData.nodes.forEach((node) => {
            if (!node.group) {
                throw new Error(`Node "${node.label}" is missing a group!`);
            }
        });
        console.log("Parsed data : ", parsedData);
        return parsedData;
    }
    catch (error) {
        console.error("Error parsing AI response:", error);
        throw new Error("Invalid architecture response format");
    }
};
const parseGenericResponse = (response) => {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error("Invalid JSON format");
        const diagramJson = JSON.parse(jsonMatch[0]);
        if (!diagramJson.nodes || !diagramJson.edges) {
            throw new Error("Missing nodes or edges in response");
        }
        return diagramJson;
    }
    catch (error) {
        console.error("Error parsing AI response:", error);
        throw new Error("Invalid generic diagram response format");
    }
};
const generateApplicationCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    console.log("[App Code Backend] Received request to generate application code");
    console.log("[App Code Backend] Request body:", JSON.stringify(req.body, null, 2));
    const { prompt, projectId, umlDiagrams, documentation, infraCode } = req.body;
    console.log("[App Code Backend] Extracted data:", {
        prompt,
        projectId,
        hasUmlDiagrams: !!umlDiagrams,
        hasDocumentation: !!documentation,
        hasInfraCode: !!infraCode
    });
    if (!prompt) {
        console.log("[App Code Backend] Missing prompt in request");
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    try {
        console.log("[App Code Backend] Constructing system prompt");
        const systemPrompt = `You are an expert fullstack developer and technical writer.

Given the following app idea and context, generate a complete, production-ready codebase for both the frontend and backend, using best practices. Your response must include:

- **Frontend**: All necessary components, pages, and utility functions, organized in a way that is ready to use in a modern React (or your stack) application.
- **Backend**: All necessary controllers, models, routes, and utility functions, organized for a Node.js/Express (or your stack) backend.
- **Documentation**: A clear, concise README or documentation that explains how to run, build, and use the app.

**Response format (JSON):**
{
  "frontend": {
    "components": { "ComponentName": "code..." },
    "pages": { "PageName": "code..." },
    "utils": { "utilName": "code..." }
  },
  "backend": {
    "controllers": { "ControllerName": "code..." },
    "models": { "ModelName": "code..." },
    "routes": { "RouteName": "code..." },
    "utils": { "utilName": "code..." }
  },
  "documentation": "README or usage instructions here"
}

**Important:**
- Do NOT return empty objects. If a section is not needed, omit it.
- Each code section should contain real, working code (not just placeholders).
- Documentation should be clear and actionable.
- DO NOT include any markdown formatting, code blocks, or explanatory text. Return ONLY the raw JSON object.

Context for code generation:
Prompt: ${prompt}

UML Diagrams:
${JSON.stringify(umlDiagrams, null, 2)}

Documentation:
${documentation || "No documentation provided."}

Infrastructure Code:
${infraCode || "No infrastructure code provided."}`;
        console.log("[App Code Backend] Sending request to OpenAI");
        const response = yield openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Generate application code for the following system:
          
Prompt: ${prompt}

UML Diagrams:
${Object.entries(umlDiagrams).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}`
                },
            ],
            max_tokens: 4096,
            temperature: 0.5,
        });
        console.log("[App Code Backend] Received response from OpenAI");
        const fullResponse = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        console.log("[App Code Backend] Full response:", fullResponse);
        try {
            // Clean the response by removing any markdown formatting
            const cleanedResponse = fullResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            const parsedResponse = JSON.parse(cleanedResponse);
            console.log("[App Code Backend] Parsed response:", parsedResponse);
            // Validate and ensure required structure with defaults
            const validatedResponse = {
                frontend: {
                    components: ((_c = parsedResponse.frontend) === null || _c === void 0 ? void 0 : _c.components) || {},
                    pages: ((_d = parsedResponse.frontend) === null || _d === void 0 ? void 0 : _d.pages) || {},
                    utils: ((_e = parsedResponse.frontend) === null || _e === void 0 ? void 0 : _e.utils) || {}
                },
                backend: {
                    controllers: ((_f = parsedResponse.backend) === null || _f === void 0 ? void 0 : _f.controllers) || {},
                    models: ((_g = parsedResponse.backend) === null || _g === void 0 ? void 0 : _g.models) || {},
                    routes: ((_h = parsedResponse.backend) === null || _h === void 0 ? void 0 : _h.routes) || {},
                    utils: ((_j = parsedResponse.backend) === null || _j === void 0 ? void 0 : _j.utils) || {}
                },
                documentation: parsedResponse.documentation || "No documentation provided."
            };
            // Save the generated code to files if projectId is provided
            if (projectId) {
                const projectDir = path_1.default.join(process.cwd(), "terraform-runner/workspace", projectId);
                if (!fs_1.default.existsSync(projectDir)) {
                    fs_1.default.mkdirSync(projectDir, { recursive: true });
                }
                // Save frontend code
                const frontendDir = path_1.default.join(projectDir, "frontend");
                if (!fs_1.default.existsSync(frontendDir)) {
                    fs_1.default.mkdirSync(frontendDir, { recursive: true });
                }
                // Save frontend components
                const componentsDir = path_1.default.join(frontendDir, "components");
                if (!fs_1.default.existsSync(componentsDir)) {
                    fs_1.default.mkdirSync(componentsDir, { recursive: true });
                }
                Object.entries(validatedResponse.frontend.components).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(componentsDir, filename), content);
                });
                // Save frontend pages
                const pagesDir = path_1.default.join(frontendDir, "pages");
                if (!fs_1.default.existsSync(pagesDir)) {
                    fs_1.default.mkdirSync(pagesDir, { recursive: true });
                }
                Object.entries(validatedResponse.frontend.pages).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(pagesDir, filename), content);
                });
                // Save frontend utils
                const frontendUtilsDir = path_1.default.join(frontendDir, "utils");
                if (!fs_1.default.existsSync(frontendUtilsDir)) {
                    fs_1.default.mkdirSync(frontendUtilsDir, { recursive: true });
                }
                Object.entries(validatedResponse.frontend.utils).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(frontendUtilsDir, filename), content);
                });
                // Save backend code
                const backendDir = path_1.default.join(projectDir, "backend");
                if (!fs_1.default.existsSync(backendDir)) {
                    fs_1.default.mkdirSync(backendDir, { recursive: true });
                }
                // Save backend controllers
                const controllersDir = path_1.default.join(backendDir, "controllers");
                if (!fs_1.default.existsSync(controllersDir)) {
                    fs_1.default.mkdirSync(controllersDir, { recursive: true });
                }
                Object.entries(validatedResponse.backend.controllers).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(controllersDir, filename), content);
                });
                // Save backend models
                const modelsDir = path_1.default.join(backendDir, "models");
                if (!fs_1.default.existsSync(modelsDir)) {
                    fs_1.default.mkdirSync(modelsDir, { recursive: true });
                }
                Object.entries(validatedResponse.backend.models).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(modelsDir, filename), content);
                });
                // Save backend routes
                const routesDir = path_1.default.join(backendDir, "routes");
                if (!fs_1.default.existsSync(routesDir)) {
                    fs_1.default.mkdirSync(routesDir, { recursive: true });
                }
                Object.entries(validatedResponse.backend.routes).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(routesDir, filename), content);
                });
                // Save backend utils
                const backendUtilsDir = path_1.default.join(backendDir, "utils");
                if (!fs_1.default.existsSync(backendUtilsDir)) {
                    fs_1.default.mkdirSync(backendUtilsDir, { recursive: true });
                }
                Object.entries(validatedResponse.backend.utils).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(backendUtilsDir, filename), content);
                });
                // Save documentation
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "README.md"), validatedResponse.documentation);
                // Save appCode to the project
                try {
                    const { getProjectById, saveProject } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                    const project = yield getProjectById(projectId);
                    if (project) {
                        project.appCode = validatedResponse;
                        yield saveProject(project);
                    }
                }
                catch (err) {
                    console.error("[App Code Backend] Error saving appCode to project:", err);
                }
            }
            res.json(validatedResponse);
        }
        catch (error) {
            console.error("[App Code Backend] Error parsing response:", error);
            res.status(500).json({
                error: "Failed to parse AI response",
                details: error instanceof Error ? error.message : "Unknown error",
                rawResponse: fullResponse
            });
        }
    }
    catch (error) {
        console.error("[App Code Backend] Error generating application code:", error);
        res.status(500).json({
            error: "Failed to generate application code",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.generateApplicationCode = generateApplicationCode;
