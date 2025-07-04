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
const memoryManager_1 = require("../utils/memoryManager");
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_SECRET_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});
const diagramJobs = {};
const iacJobs = {};
// Set up memory management for job stores
memoryManager_1.memoryManager.setupJobStoreCleanup(diagramJobs, "diagramJobs", 20 * 60 * 1000, 50); // 20 min, max 50 jobs
memoryManager_1.memoryManager.setupJobStoreCleanup(iacJobs, "iacJobs", 30 * 60 * 1000, 50); // 30 min, max 50 jobs
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
        var _a, _b;
        try {
            diagramJobs[jobId] = Object.assign(Object.assign({}, diagramJobs[jobId]), { status: "processing", progress: 10, lastAccessed: new Date() });
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
    return `iac-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
const generateIaC = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, projectId, umlDiagrams } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    const jobId = generateJobId();
    iacJobs[jobId] = {
        status: "pending",
        progress: 0,
        startTime: new Date(),
        lastAccessed: new Date()
    };
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
            iacJobs[jobId] = Object.assign(Object.assign({}, iacJobs[jobId]), { status: "processing", progress: 10, lastAccessed: new Date() });
            const systemPrompt = `
You are a senior cloud architect and Terraform expert specializing in AWS infrastructure design for modern applications.

**CRITICAL OUTPUT FORMAT: You must respond with ONLY pure Terraform HCL code. NO markdown formatting, NO code fences, NO explanations, NO backticks, NO text blocks. Just raw .tf file content that can be directly saved and executed.**

**EXAMPLE OF WHAT NOT TO DO:**
Do not wrap in code fences like this:
\`\`\`hcl
terraform {
  # DON'T include these backticks or code fences
}
\`\`\`

**EXAMPLE OF CORRECT OUTPUT:**
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

**CRITICAL: This is BARE-BONES INFRASTRUCTURE PROVISIONING ONLY. Do not assume any application code, zip files, or deployment packages exist.**

**INFRASTRUCTURE ANALYSIS STEPS:**
1. Determine application type (web app, API, data processing, mobile backend, etc.)
2. Identify required services (compute, storage, database, messaging, etc.)
3. Assess scale requirements (simple prototype vs production-ready)
4. Generate minimal but complete infrastructure with placeholder deployment packages

**MODERN TERRAFORM REQUIREMENTS:**
1. Use Terraform 1.5+ syntax with proper required_providers block
2. AWS Provider version "~> 5.0" with all modern resource configurations
3. Use random_string for unique resource naming to prevent conflicts
4. Include proper dependencies and resource ordering
5. For Lambda functions, use placeholder deployment packages or dummy zip files

**AWS PROVIDER BEST PRACTICES:**
- **Lambda Functions**: Use placeholder deployment packages with proper configuration
  - Use \`filename\` parameter with a dummy zip file path or inline code
  - Use nodejs18.x, nodejs20.x, or nodejs22.x runtime only
  - Include proper IAM roles and policies
  - DO NOT use invalid "code" blocks - they don't exist in Terraform
- **RDS**: Use aws_db_instance for simple databases, aws_rds_cluster + aws_rds_cluster_instance for Aurora (both require engine parameter)
- **S3**: Use separate resources for aws_s3_bucket_public_access_block and aws_s3_bucket_policy (NO acl parameter)
- **IAM**: Use least-privilege policies with specific resource ARNs
- **API Gateway**: Use REGIONAL endpoints with proper CORS configuration

**LAMBDA FUNCTION CORRECT SYNTAX:**
resource "aws_lambda_function" "example" {
  function_name = "example-function-$\{random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn
  
  # Use inline code for placeholder deployment
  filename      = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  timeout     = 30
  memory_size = 256
  
  environment {
    variables = {
      NODE_ENV = "production"
    }
  }
}

# Create placeholder zip file
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "placeholder.zip"
  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Hello from Lambda!' }) });"
    filename = "index.js"
  }
}

**INFRASTRUCTURE PATTERNS BY APPLICATION TYPE:**

**Simple Web App:**
- S3 bucket for frontend hosting + CloudFront
- Lambda for API + API Gateway
- DynamoDB for data storage
- All with placeholder deployment packages

**REST API:**
- Lambda functions for endpoints with placeholder code
- API Gateway with proper resources/methods
- RDS or DynamoDB based on data needs
- S3 for file storage if needed

**Data Processing App:**
- Lambda for processing with placeholder code
- SQS for queuing
- S3 for data storage
- DynamoDB for metadata

**Real-time App:**
- WebSocket API Gateway
- Lambda for real-time processing with placeholder code
- DynamoDB with streams
- SNS/SQS for messaging

**AI/ML App:**
- SageMaker for model hosting
- Lambda for API layer with placeholder code
- S3 for model artifacts
- Cognito for authentication

**REQUIRED TERRAFORM STRUCTURE:**
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Generate ONLY resources needed for the specific application
# Include placeholder deployment packages for Lambda functions

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

output "main_url" {
  value = # appropriate URL based on infrastructure
  description = "Main application URL"
}

**CRITICAL REQUIREMENTS:**
- NEVER use deprecated aws_s3_bucket acl parameter
- ALWAYS include engine parameter for RDS resources
- ALWAYS use random_string suffix for resource names
- ONLY generate resources the application actually needs
- Use appropriate database type (DynamoDB for NoSQL, RDS for relational)
- Include proper IAM roles with minimal permissions
- Add meaningful outputs for application URLs and endpoints
- NEVER wrap output in markdown code fences or backticks
- For Lambda functions, always include placeholder deployment packages
- NEVER use invalid "code" blocks in Lambda functions
- This is infrastructure provisioning only - no application deployment assumptions

**ANALYSIS EXAMPLES:**

"AI meal planning app"
→ Generate: Cognito + Lambda (with placeholder code) + DynamoDB + S3 + API Gateway

"Real-time chat application" 
→ Generate: Cognito + WebSocket API + Lambda (with placeholder code) + DynamoDB with streams + SNS

"Todo app with user authentication"
→ Generate: Cognito + API Gateway + Lambda (with placeholder code) + DynamoDB + S3 (full web app stack)

"File processing service"
→ Generate: S3 + Lambda (with placeholder code) + SQS + DynamoDB for job tracking

RESPOND WITH ONLY RAW TERRAFORM HCL CODE. Start immediately with "terraform {" - no markdown, no explanations, no formatting.
`;
            iacJobs[jobId] = Object.assign(Object.assign({}, iacJobs[jobId]), { progress: 20, lastAccessed: new Date() });
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
            iacJobs[jobId] = Object.assign(Object.assign({}, iacJobs[jobId]), { progress: 60, lastAccessed: new Date() });
            const terraformCode = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "";
            console.log(`[IaC] OpenAI raw response for jobId=${jobId}:`, (_e = (_d = response.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content);
            // Post-process to ensure clean Terraform code (remove any markdown formatting)
            const cleanTerraformCode = terraformCode
                .replace(/^```hcl\s*/gm, '') // Remove opening code fences
                .replace(/^```\s*$/gm, '') // Remove closing code fences
                .replace(/^\s*```.*$/gm, '') // Remove any other code fence variants
                .trim();
            console.log(`[IaC] Cleaned terraformCode length: ${cleanTerraformCode.length}`);
            if (!cleanTerraformCode) {
                console.error(`[IaC] No Terraform code generated for jobId=${jobId}, projectId=${projectId}`);
            }
            // Save the generated code to a file if projectId is provided
            if (projectId) {
                const projectDir = path_1.default.join(process.cwd(), "terraform-runner/workspace", projectId);
                if (!fs_1.default.existsSync(projectDir)) {
                    fs_1.default.mkdirSync(projectDir, { recursive: true });
                    console.log(`[IaC] Created project directory: ${projectDir}`);
                }
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "terraform.tf"), cleanTerraformCode);
                console.log(`[IaC] Saved terraform.tf for projectId=${projectId} at ${projectDir}`);
                try {
                    const { getProjectById, saveProject } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                    const project = yield getProjectById(projectId);
                    if (project) {
                        project.infraCode = cleanTerraformCode;
                        yield saveProject(project);
                    }
                }
                catch (err) {
                    console.error("[IaC Backend] Error saving infraCode to project:", err);
                }
            }
            iacJobs[jobId] = Object.assign(Object.assign({}, iacJobs[jobId]), { status: "completed", progress: 100, result: { code: cleanTerraformCode }, endTime: new Date(), lastAccessed: new Date() });
        }
        catch (error) {
            console.error(`[IaC] Error in processIaCJob for jobId=${jobId}, projectId=${projectId}:`, error);
            iacJobs[jobId] = Object.assign(Object.assign({}, iacJobs[jobId]), { status: "failed", progress: 100, error: error.message || "Unknown error", endTime: new Date(), lastAccessed: new Date() });
        }
    });
}
const getIaCJobStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!jobId || !iacJobs[jobId]) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    // Update access time for memory management
    memoryManager_1.memoryManager.touchJob(iacJobs[jobId]);
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
    console.log("[Agentic Code Gen] Starting sophisticated code generation");
    console.log("[Agentic Code Gen] Request body:", JSON.stringify(req.body, null, 2));
    const { prompt, projectId, umlDiagrams, documentation, infraCode } = req.body;
    console.log("[Agentic Code Gen] Extracted data:", {
        prompt,
        projectId,
        hasUmlDiagrams: !!umlDiagrams,
        hasDocumentation: !!documentation,
        hasInfraCode: !!infraCode
    });
    if (!prompt) {
        console.log("[Agentic Code Gen] Missing prompt in request");
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    if (!umlDiagrams || Object.keys(umlDiagrams).length === 0) {
        console.log("[Agentic Code Gen] No UML diagrams provided - falling back to basic generation");
        return generateBasicApplicationCode(req, res);
    }
    try {
        console.log("[Agentic Code Gen] Starting agentic code generation pipeline");
        // Phase 1: Analyze diagrams and extract components
        const analysisResult = yield analyzeDiagramsAndExtractComponents(umlDiagrams, prompt);
        // Phase 2: Decompose components into focused subcomponents
        const decompositionResult = yield decomposeComponentsIntoSubcomponents(analysisResult);
        // Phase 3: Generate code for each component individually
        const codeGenerationResult = yield generateIndividualComponents(decompositionResult, prompt, infraCode);
        // Phase 4: Generate integration code using sequence diagram
        const integrationResult = yield generateIntegrationCode(codeGenerationResult, umlDiagrams.sequence || umlDiagrams.sequenceDiagram, prompt);
        // Phase 5: Assemble final application
        const finalApplication = yield assembleFinalApplication(codeGenerationResult, integrationResult, documentation);
        console.log("[Agentic Code Gen] Successfully generated application code");
        // Save results if projectId provided
        if (projectId) {
            yield saveGeneratedCodeToProject(projectId, finalApplication);
        }
        res.json(finalApplication);
    }
    catch (error) {
        console.error("[Agentic Code Gen] Error in agentic code generation:", error);
        res.status(500).json({
            error: "Failed to generate application code using agentic approach",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.generateApplicationCode = generateApplicationCode;
// Rate limiting and retry logic for AI requests
function makeAIRequestWithRetry(prompt_1) {
    return __awaiter(this, arguments, void 0, function* (prompt, model = "gpt-4o", maxRetries = 3) {
        var _a, _b, _c, _d, _e;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Agentic Code Gen] AI request attempt ${attempt}/${maxRetries}`);
                // Try OpenAI first
                if (process.env.OPENAI_API_KEY) {
                    try {
                        const response = yield openai.chat.completions.create({
                            model: model,
                            messages: [{ role: "user", content: prompt }],
                            max_tokens: 3000,
                            temperature: 0.3,
                        });
                        console.log(`[Agentic Code Gen] OpenAI request successful on attempt ${attempt}`);
                        return ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "{}";
                    }
                    catch (error) {
                        console.log(`[Agentic Code Gen] OpenAI failed on attempt ${attempt}:`, error.message);
                        // If it's a rate limit error, try Anthropic immediately
                        if (((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('429')) || ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('quota'))) {
                            console.log(`[Agentic Code Gen] Rate limit detected, trying Anthropic...`);
                            return yield makeAnthropicRequestForCodeGen(prompt);
                        }
                        lastError = error;
                    }
                }
                // Fallback to Anthropic
                if (process.env.ANTHROPIC_SECRET_KEY) {
                    try {
                        const response = yield makeAnthropicRequestForCodeGen(prompt);
                        console.log(`[Agentic Code Gen] Anthropic request successful on attempt ${attempt}`);
                        return response;
                    }
                    catch (error) {
                        console.log(`[Agentic Code Gen] Anthropic failed on attempt ${attempt}:`, error.message);
                        lastError = error;
                    }
                }
                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.log(`[Agentic Code Gen] Waiting ${delay}ms before retry...`);
                    yield new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            catch (error) {
                console.error(`[Agentic Code Gen] Unexpected error on attempt ${attempt}:`, error);
                lastError = error;
            }
        }
        throw lastError || new Error("All AI providers failed after retries");
    });
}
function makeAnthropicRequestForCodeGen(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 4000,
            temperature: 0.3,
            messages: [{ role: "user", content: prompt }]
        });
        const content = response.content[0];
        if (content.type === 'text') {
            return content.text;
        }
        throw new Error("Invalid response format from Anthropic");
    });
}
// Phase 1: Analyze diagrams and extract components
function analyzeDiagramsAndExtractComponents(umlDiagrams, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        console.log("[Agentic Code Gen] Phase 1: Analyzing diagrams and extracting components");
        const analysisPrompt = `You are an expert software architect. Analyze the following UML diagrams and application requirements to extract a comprehensive list of components and their responsibilities.

Application Requirements: ${prompt}

UML Diagrams:
${Object.entries(umlDiagrams).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}

Analyze and return a JSON response with the following structure:
{
  "components": [
    {
      "name": "ComponentName",
      "type": "frontend|backend|shared",
      "category": "controller|service|model|repository|component|page|utility",
      "responsibilities": ["responsibility1", "responsibility2"],
      "dependencies": ["dependency1", "dependency2"],
      "complexity": "low|medium|high",
      "methods": ["method1", "method2"],
      "interfaces": ["interface1", "interface2"]
    }
  ],
  "relationships": [
    {
      "from": "ComponentA",
      "to": "ComponentB", 
      "type": "uses|extends|implements|calls",
      "description": "relationship description"
    }
  ],
  "dataFlow": [
    {
      "source": "ComponentA",
      "target": "ComponentB",
      "data": "data description",
      "direction": "bidirectional|unidirectional"
    }
  ],
  "architecture": {
    "pattern": "MVC|MVP|MVVM|layered|microservices",
    "layers": ["presentation", "business", "data"],
    "concerns": ["authentication", "validation", "logging", "error-handling"]
  }
}

Focus on:
1. Extracting ALL components mentioned in diagrams
2. Understanding component responsibilities and boundaries
3. Identifying relationships and dependencies
4. Determining complexity levels for generation planning
5. Mapping data flow between components

Return ONLY the JSON response, no explanations.`;
        const responseContent = yield makeAIRequestWithRetry(analysisPrompt);
        const analysisResult = JSON.parse(responseContent);
        console.log("[Agentic Code Gen] Phase 1 Complete: Extracted", ((_a = analysisResult.components) === null || _a === void 0 ? void 0 : _a.length) || 0, "components");
        return analysisResult;
    });
}
// Phase 2: Decompose components into focused subcomponents
function decomposeComponentsIntoSubcomponents(analysisResult) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        console.log("[Agentic Code Gen] Phase 2: Decomposing complex components");
        const complexComponents = ((_a = analysisResult.components) === null || _a === void 0 ? void 0 : _a.filter((comp) => comp.complexity === 'high')) || [];
        if (complexComponents.length === 0) {
            console.log("[Agentic Code Gen] No complex components to decompose");
            return analysisResult;
        }
        const decompositionPrompt = `You are an expert in software architecture and component design. The following components have been identified as complex and need to be decomposed into smaller, focused subcomponents.

Complex Components:
${JSON.stringify(complexComponents, null, 2)}

Architecture Context:
${JSON.stringify(analysisResult.architecture, null, 2)}

Decompose each complex component into smaller, atomic subcomponents following these principles:
1. Single Responsibility Principle - each subcomponent should have ONE clear purpose
2. Separation of Concerns - UI, business logic, data access should be separate
3. High Cohesion, Low Coupling
4. Atomic Methods - each method should do one thing well

Return JSON with this structure:
{
  "decomposedComponents": [
    {
      "originalComponent": "ComponentName",
      "subcomponents": [
        {
          "name": "SubcomponentName",
          "type": "frontend|backend|shared",
          "category": "controller|service|model|repository|component|page|utility",
          "responsibilities": ["specific responsibility"],
          "methods": ["atomicMethod1", "atomicMethod2"],
          "complexity": "low|medium",
          "interfaces": ["interface if needed"],
          "rationale": "why this subcomponent exists"
        }
      ]
    }
  ],
  "newRelationships": [
    {
      "from": "SubcomponentA",
      "to": "SubcomponentB",
      "type": "uses|calls|implements",
      "description": "relationship description"
    }
  ]
}

Return ONLY the JSON response.`;
        const responseContent = yield makeAIRequestWithRetry(decompositionPrompt);
        const decompositionResult = JSON.parse(responseContent);
        // Merge decomposed components back into the main analysis
        if (decompositionResult.decomposedComponents) {
            const decomposedComponentNames = new Set();
            // Add new subcomponents
            decompositionResult.decomposedComponents.forEach((decomp) => {
                decomposedComponentNames.add(decomp.originalComponent);
                analysisResult.components.push(...decomp.subcomponents);
            });
            // Remove original complex components that were decomposed
            analysisResult.components = analysisResult.components.filter((comp) => !decomposedComponentNames.has(comp.name));
            // Add new relationships
            if (decompositionResult.newRelationships) {
                analysisResult.relationships.push(...decompositionResult.newRelationships);
            }
        }
        console.log("[Agentic Code Gen] Phase 2 Complete: Total components after decomposition:", ((_b = analysisResult.components) === null || _b === void 0 ? void 0 : _b.length) || 0);
        return analysisResult;
    });
}
// Phase 3: Generate code for each component individually
function generateIndividualComponents(analysisResult, prompt, infraCode) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[Agentic Code Gen] Phase 3: Generating individual components");
        const components = analysisResult.components || [];
        const relationships = analysisResult.relationships || [];
        const architecture = analysisResult.architecture || {};
        const generatedComponents = {
            frontend: { components: {}, pages: {}, utils: {} },
            backend: { controllers: {}, models: {}, routes: {}, utils: {}, services: {} },
            shared: { interfaces: {}, types: {}, utils: {} }
        };
        // Generate components in batches to avoid overwhelming the AI
        const batchSize = 3;
        for (let i = 0; i < components.length; i += batchSize) {
            const batch = components.slice(i, i + batchSize);
            console.log(`[Agentic Code Gen] Generating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(components.length / batchSize)}`);
            for (const component of batch) {
                try {
                    const componentCode = yield generateSingleComponent(component, relationships.filter((rel) => rel.from === component.name || rel.to === component.name), architecture, prompt, infraCode);
                    // Organize generated code by type and category
                    const category = mapComponentToCategory(component);
                    if (componentCode && componentCode.trim()) {
                        generatedComponents[component.type][category][component.name] = componentCode;
                    }
                }
                catch (error) {
                    console.error(`[Agentic Code Gen] Error generating component ${component.name}:`, error);
                    // Continue with other components
                }
            }
            // Small delay between batches to avoid rate limiting
            yield new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log("[Agentic Code Gen] Phase 3 Complete: Generated", Object.values(generatedComponents).reduce((total, tier) => total + Object.values(tier).reduce((subtotal, category) => subtotal + Object.keys(category).length, 0), 0), "components");
        return generatedComponents;
    });
}
// Generate a single focused component
function generateSingleComponent(component, componentRelationships, architecture, appPrompt, infraCode) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const componentPrompt = `You are an expert ${component.type} developer. Generate high-quality, production-ready code for the following component.

Application Context: ${appPrompt}

Component Details:
- Name: ${component.name}
- Type: ${component.type}
- Category: ${component.category}
- Responsibilities: ${(_a = component.responsibilities) === null || _a === void 0 ? void 0 : _a.join(', ')}
- Methods: ${(_b = component.methods) === null || _b === void 0 ? void 0 : _b.join(', ')}
- Interfaces: ${(_c = component.interfaces) === null || _c === void 0 ? void 0 : _c.join(', ')}

Relationships:
${componentRelationships.map(rel => `- ${rel.type} ${rel.from === component.name ? rel.to : rel.from}: ${rel.description}`).join('\n')}

Architecture Pattern: ${architecture.pattern || 'layered'}
Architecture Layers: ${(_d = architecture.layers) === null || _d === void 0 ? void 0 : _d.join(', ')}

Infrastructure Context (for backend components):
${component.type === 'backend' ? (infraCode === null || infraCode === void 0 ? void 0 : infraCode.substring(0, 1000)) + '...' : 'N/A'}

Requirements:
1. Generate ONLY the code for this specific component
2. Follow ${component.type === 'frontend' ? 'React/TypeScript' : 'Node.js/TypeScript'} best practices
3. Implement ALL responsibilities and methods
4. Use proper error handling and validation
5. Include necessary imports and dependencies
6. Follow the ${architecture.pattern} pattern
7. Make methods atomic and focused
8. Use TypeScript interfaces for type safety
9. Include proper JSDoc comments
10. Handle async operations properly

${component.type === 'frontend' ? `
Frontend Specific:
- Use modern React hooks and functional components
- Implement proper state management
- Use Material-UI or styled-components for styling
- Handle loading and error states
- Implement proper accessibility
` : `
Backend Specific:
- Use Express.js patterns
- Implement proper middleware
- Use async/await for database operations
- Include input validation
- Implement proper error responses
- Use dependency injection where appropriate
`}

Return ONLY the code for this component. No explanations, no markdown formatting, just clean, executable code.`;
        return yield makeAIRequestWithRetry(componentPrompt, "gpt-4o", 2); // Reduced retries for individual components
    });
}
// Helper function to map component to file category
function mapComponentToCategory(component) {
    const categoryMap = {
        'controller': 'controllers',
        'service': 'services',
        'model': 'models',
        'repository': 'models', // repositories often go with models
        'component': 'components',
        'page': 'pages',
        'utility': 'utils',
        'route': 'routes'
    };
    return categoryMap[component.category] || 'utils';
}
// Phase 4: Generate integration code using sequence diagram
function generateIntegrationCode(generatedComponents, sequenceDiagram, prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("[Agentic Code Gen] Phase 4: Generating integration code");
        if (!sequenceDiagram) {
            console.log("[Agentic Code Gen] No sequence diagram provided, skipping integration generation");
            return {};
        }
        const integrationPrompt = `You are an expert in software integration and API design. Using the sequence diagram and generated components, create integration code that connects all components according to the specified flow.

Application Context: ${prompt}

Sequence Diagram:
${sequenceDiagram}

Generated Components Summary:
Frontend: ${Object.keys(generatedComponents.frontend.components || {}).join(', ')}
Backend Controllers: ${Object.keys(generatedComponents.backend.controllers || {}).join(', ')}
Backend Services: ${Object.keys(generatedComponents.backend.services || {}).join(', ')}
Backend Models: ${Object.keys(generatedComponents.backend.models || {}).join(', ')}

Generate integration code including:
1. API endpoints and routing
2. Service layer integration
3. Database connection and setup
4. Frontend API client
5. Error handling middleware
6. Authentication middleware (if needed)
7. Main application entry points

Return JSON with this structure:
{
  "backend": {
    "routes": {
      "main.ts": "main routing file",
      "api.ts": "API route definitions"
    },
    "middleware": {
      "auth.ts": "authentication middleware",
      "error.ts": "error handling middleware"
    },
    "config": {
      "database.ts": "database configuration",
      "app.ts": "application setup"
    }
  },
  "frontend": {
    "services": {
      "api.ts": "API client service",
      "auth.ts": "authentication service"
    },
    "hooks": {
      "useApi.ts": "API hooks",
      "useAuth.ts": "authentication hooks"
    }
  },
  "shared": {
    "types": {
      "api.ts": "shared API types",
      "models.ts": "shared model types"
    }
  }
}

Focus on creating clean, maintainable integration code that follows the sequence diagram flow.
Return ONLY the JSON response.`;
        const responseContent = yield makeAIRequestWithRetry(integrationPrompt);
        const integrationResult = JSON.parse(responseContent);
        console.log("[Agentic Code Gen] Phase 4 Complete: Generated integration code");
        return integrationResult;
    });
}
// Phase 5: Assemble final application
function assembleFinalApplication(generatedComponents, integrationCode, documentation) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        console.log("[Agentic Code Gen] Phase 5: Assembling final application");
        // Merge generated components with integration code
        const finalApplication = {
            frontend: {
                components: generatedComponents.frontend.components || {},
                pages: generatedComponents.frontend.pages || {},
                utils: Object.assign(Object.assign({}, generatedComponents.frontend.utils), (_a = integrationCode.frontend) === null || _a === void 0 ? void 0 : _a.services),
                hooks: ((_b = integrationCode.frontend) === null || _b === void 0 ? void 0 : _b.hooks) || {},
                services: ((_c = integrationCode.frontend) === null || _c === void 0 ? void 0 : _c.services) || {}
            },
            backend: {
                controllers: generatedComponents.backend.controllers || {},
                models: generatedComponents.backend.models || {},
                services: generatedComponents.backend.services || {},
                routes: Object.assign(Object.assign({}, generatedComponents.backend.routes), (_d = integrationCode.backend) === null || _d === void 0 ? void 0 : _d.routes),
                utils: generatedComponents.backend.utils || {},
                middleware: ((_e = integrationCode.backend) === null || _e === void 0 ? void 0 : _e.middleware) || {},
                config: ((_f = integrationCode.backend) === null || _f === void 0 ? void 0 : _f.config) || {}
            },
            shared: {
                types: Object.assign(Object.assign({}, generatedComponents.shared.types), (_g = integrationCode.shared) === null || _g === void 0 ? void 0 : _g.types),
                interfaces: generatedComponents.shared.interfaces || {},
                utils: generatedComponents.shared.utils || {}
            },
            documentation: documentation || "Generated using agentic code generation system"
        };
        console.log("[Agentic Code Gen] Phase 5 Complete: Final application assembled");
        return finalApplication;
    });
}
// Save generated code to project
function saveGeneratedCodeToProject(projectId, application) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { getProjectById, saveProject } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
            const project = yield getProjectById(projectId);
            if (project) {
                project.appCode = application;
                yield saveProject(project);
                console.log("[Agentic Code Gen] Saved generated code to project");
            }
        }
        catch (err) {
            console.error("[Agentic Code Gen] Error saving code to project:", err);
        }
    });
}
// Fallback to basic generation if no UML diagrams
function generateBasicApplicationCode(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        // Keep the existing basic generation as fallback
        const { prompt, projectId } = req.body;
        console.log("[Basic Code Gen] Falling back to basic code generation");
        const basicResponse = {
            frontend: {
                components: { "App.tsx": "// Basic React app component\nexport default function App() { return <div>Hello World</div>; }" },
                pages: {},
                utils: {}
            },
            backend: {
                controllers: { "main.js": "// Basic Express controller\nmodule.exports = { hello: (req, res) => res.json({message: 'Hello'}) };" },
                models: {},
                routes: {},
                utils: {}
            },
            documentation: "Basic application generated without UML diagrams"
        };
        if (projectId) {
            yield saveGeneratedCodeToProject(projectId, basicResponse);
        }
        res.json(basicResponse);
    });
}
