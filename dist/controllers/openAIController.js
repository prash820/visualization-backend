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
exports.generateApplicationCode = exports.generateIaC = exports.generateVisualization = void 0;
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
const generateVisualization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { prompt, diagramType } = req.body;
    console.log("🔹 Prompt:", req.body);
    if (!prompt || !diagramType) {
        console.log("🔹 Missing required parameters.");
        return res.status(400).json({ error: "Missing required parameters." });
    }
    console.log(`[AI] Generating diagram for prompt: ${prompt} with diagramType: ${diagramType}`);
    const systemPrompt = {
        flowchart: `
                  You are an AI assistant specialized in generating flowcharts based on user prompts.
              Return only valid JSON with two arrays: "nodes" and "edges".
              Each node should have an "id", "label", "role", and a default position.
              Each edge should connect nodes using "sourceLabel", "targetLabel" and edge label that says what is happening between steps.
              Role means the type of node, like start/end, process, decision, input output, etc
              Do not include any extra text.          
      `,
        architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.

### **🔹 User Query:** "<User's Input>"
### **🔹 Diagram Type:** "architecture"

## **🌟 Rules for Generating JSON Output**
1️⃣ **Group services under their respective cloud providers** (AWS, Azure, OCI).  
2️⃣ **If a cloud provider has a VPC, the services inside that VPC should be grouped inside it.**  
3️⃣ **Keep cloud providers as separate top-level groups**, even if services communicate between providers.  
4️⃣ **Ensure correct edge connections** between services, even across different providers.  
5️⃣ **Use proper hierarchical nesting** to reflect real-world cloud architectures.  

### **📌 Expected JSON Format** No Other text should be part of the response or no additional follow up questions

{
  "groups": [
    { "id": "aws-services", "label": "AWS Services" },
    { "id": "aws-vpc-1", "label": "AWS VPC 1", "parentGroup": "aws-services" },
    { "id": "azure-services", "label": "Azure Services" },
    { "id": "oci-services", "label": "OCI Services" }
  ],
  "nodes": [
    { "id": "api-gateway", "label": "API Gateway", "service": "api-gateway", "group": "aws-services" },
    { "id": "lambda-1", "label": "Lambda Function", "service": "lambda", "group": "aws-vpc-1" },
    { "id": "s3", "label": "S3 Storage", "service": "s3", "group": "aws-services" },
    { "id": "rds", "label": "RDS Database", "service": "rds", "group": "aws-services" },
    { "id": "azure-app-service", "label": "Azure Web App", "service": "app-service", "group": "azure-services" },
    { "id": "oci-object-storage", "label": "OCI Object Storage", "service": "object-storage", "group": "oci-services" }
  ],
  "edges": [
  { "source": "api-gateway", "target": "lambda-1", "label": "Invokes" },
  { "source": "lambda-1", "target": "s3", "label": "Stores Data" },
  { "source": "lambda-1", "target": "rds", "label": "Queries" },
  { "source": "azure-app-service", "target": "oci-object-storage", "label": "Writes To" }
]

}
`,
        sequence: `
          You are an AI assistant specialized in generating sequence diagrams based on user prompts.
        Return only valid JSON with two arrays: "nodes" and "edges".
        Nodes represent actors or steps, and edges represent the flow of interactions.
        Format example:
        {
          "nodes": [{ "label": "Actor or Step" }],
          "edges": [{ "sourceLabel": "Label", "targetLabel": "Label", "label": "Message" }]
        }
        Do not include any extra text.
      `,
        uml: `
                You are an AI assistant specialized in generating UML class diagrams based on user prompts.
                Return only valid JSON with two arrays: "nodes" and "edges".
                Each node represents a class (with a "label"), and edges represent relationships between classes.
                Format example:
                {
                  "nodes": [{ "label": "ClassName" }],
                  "edges": [{ "sourceLabel": "ClassName", "targetLabel": "ClassName", "label": "Relationship" }]
                }
                Do not include any extra text.
                      `
    };
    // Choose a system prompt based on diagramType
    try {
        console.log("User Prompt:", prompt);
        const response = yield openai.chat.completions.create({
            model: "gpt-4-0125-preview",
            messages: [
                { role: "system", content: systemPrompt[diagramType] },
                { role: "user", content: prompt },
            ],
            max_tokens: 4096,
            temperature: 0.5,
        });
        const fullResponse = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        switch (diagramType) {
            case "architecture": {
                const parsedData = parseArchitectureResponse(fullResponse);
                return res.json(parsedData);
            }
            default: {
                const parseData = parseGenericResponse(fullResponse);
                return res.json(parseData);
            }
        }
    }
    catch (error) {
        console.error("Error generating visualization:", error);
        return res.status(500).json({ error: "Failed to generate diagram." });
    }
});
exports.generateVisualization = generateVisualization;
const generateIaC = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log("[IaC Backend] Received request to generate infrastructure code");
    const { prompt, projectId, umlDiagrams } = req.body;
    console.log("[IaC Backend] Request body:", { prompt, projectId, umlDiagrams });
    if (!prompt) {
        console.log("[IaC Backend] Missing prompt in request");
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    try {
        console.log("[IaC Backend] Constructing system prompt");
        // Construct a strict system prompt that requires only a JSON object in the response
        const systemPrompt = `You are an AI assistant that generates Infrastructure as Code (IaC) using Terraform.

Your task is to generate production-ready Terraform code for the user's project, based on their prompt and UML diagrams.

**IMPORTANT INSTRUCTIONS:**
1. Analyze the provided UML diagrams to understand the system architecture
2. Generate Terraform code that exactly matches the components and relationships shown in the diagrams
3. Include all necessary AWS services shown in the diagrams (e.g., API Gateway, Lambda, S3, DynamoDB, Cognito)
4. Set up proper IAM roles and permissions for service interactions
5. Configure security groups and network access as needed
6. Return ONLY a raw JSON object, with no markdown formatting, code blocks, or extra text
7. Do not wrap the response in \`\`\`json or any other markdown formatting

The JSON object must have two fields:
- "code": a string containing the complete Terraform code (all files concatenated, with clear file boundaries as comments)
- "documentation": a string containing Markdown documentation for the infrastructure

**Example output format (return exactly this format, no markdown):**
{
  "code": "// main.tf\n...\n// variables.tf\n...\n",
  "documentation": "# Infrastructure Documentation\n..."
}`;
        console.log("[IaC Backend] Sending request to OpenAI");
        const response = yield openai.chat.completions.create({
            model: "gpt-4-0125-preview",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: `Generate infrastructure code for the following system:
          
Prompt: ${prompt}

UML Diagrams:
${Object.entries(umlDiagrams).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}`
                },
            ],
            max_tokens: 4096,
            temperature: 0.5,
        });
        console.log("[IaC Backend] Received response from OpenAI");
        const fullResponse = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        console.log("[IaC Backend] Full response:", fullResponse);
        try {
            // Clean the response by removing any markdown formatting
            const cleanedResponse = fullResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            const parsedResponse = JSON.parse(cleanedResponse);
            console.log("[IaC Backend] Parsed response:", parsedResponse);
            // Validate the response structure
            if (!parsedResponse.code || !parsedResponse.documentation) {
                throw new Error("Response missing required fields: code and documentation");
            }
            // Save the generated code to a file if projectId is provided
            if (projectId) {
                const projectDir = path_1.default.join(process.cwd(), "workspace", projectId);
                if (!fs_1.default.existsSync(projectDir)) {
                    fs_1.default.mkdirSync(projectDir, { recursive: true });
                }
                // Save the Terraform code
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "terraform.tf"), parsedResponse.code);
                // Save the documentation
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "README.md"), parsedResponse.documentation);
            }
            res.json(parsedResponse);
        }
        catch (error) {
            console.error("[IaC Backend] Error parsing response:", error);
            res.status(500).json({
                error: "Failed to parse AI response",
                details: error instanceof Error ? error.message : "Unknown error",
                rawResponse: fullResponse
            });
        }
    }
    catch (error) {
        console.error("[IaC Backend] Error generating IaC:", error);
        res.status(500).json({
            error: "Failed to generate infrastructure code",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
exports.generateIaC = generateIaC;
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
    var _a, _b;
    console.log("[App Code Backend] Received request to generate application code");
    const { prompt, projectId, umlDiagrams } = req.body;
    console.log("[App Code Backend] Request body:", { prompt, projectId, umlDiagrams });
    if (!prompt) {
        console.log("[App Code Backend] Missing prompt in request");
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    try {
        console.log("[App Code Backend] Constructing system prompt");
        const systemPrompt = `You are an AI assistant that generates production-ready application code based on UML diagrams.

Your task is to generate application code that implements the system design shown in the UML diagrams.

**IMPORTANT INSTRUCTIONS:**
1. Analyze the provided UML diagrams (component, sequence, class) to understand the system architecture
2. Generate code that implements the components, interactions, and data structures shown in the diagrams
3. Follow best practices for the specified technology stack
4. Include proper error handling, logging, and documentation
5. Return ONLY a raw JSON object, with no markdown formatting, code blocks, or extra text
6. Do not wrap the response in \`\`\`json or any other markdown formatting

The JSON object must have these fields:
- "frontend": object containing frontend code files
  - "components": object mapping component names to their code
  - "pages": object mapping page names to their code
  - "utils": object mapping utility function names to their code
- "backend": object containing backend code files
  - "controllers": object mapping controller names to their code
  - "models": object mapping model names to their code
  - "routes": object mapping route names to their code
  - "utils": object mapping utility function names to their code
- "documentation": string containing Markdown documentation for the application

**Example output format (return exactly this format, no markdown):**
{
  "frontend": {
    "components": {
      "UserProfile.tsx": "import React from 'react';\n...",
      "PostList.tsx": "import React from 'react';\n..."
    },
    "pages": {
      "Home.tsx": "import React from 'react';\n...",
      "Profile.tsx": "import React from 'react';\n..."
    },
    "utils": {
      "api.ts": "export const fetchData = async () => {\n...",
      "auth.ts": "export const login = async () => {\n..."
    }
  },
  "backend": {
    "controllers": {
      "userController.ts": "export const getUser = async (req, res) => {\n...",
      "postController.ts": "export const createPost = async (req, res) => {\n..."
    },
    "models": {
      "User.ts": "export interface User {\n...",
      "Post.ts": "export interface Post {\n..."
    },
    "routes": {
      "userRoutes.ts": "import express from 'express';\n...",
      "postRoutes.ts": "import express from 'express';\n..."
    },
    "utils": {
      "db.ts": "export const connectDB = async () => {\n...",
      "auth.ts": "export const verifyToken = async (token) => {\n..."
    }
  },
  "documentation": "# Application Documentation\n..."
}`;
        console.log("[App Code Backend] Sending request to OpenAI");
        const response = yield openai.chat.completions.create({
            model: "gpt-4-0125-preview",
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
            // Validate the response structure
            if (!parsedResponse.frontend || !parsedResponse.backend || !parsedResponse.documentation) {
                throw new Error("Response missing required fields: frontend, backend, and documentation");
            }
            // Save the generated code to files if projectId is provided
            if (projectId) {
                const projectDir = path_1.default.join(process.cwd(), "workspace", projectId);
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
                Object.entries(parsedResponse.frontend.components).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(componentsDir, filename), content);
                });
                // Save frontend pages
                const pagesDir = path_1.default.join(frontendDir, "pages");
                if (!fs_1.default.existsSync(pagesDir)) {
                    fs_1.default.mkdirSync(pagesDir, { recursive: true });
                }
                Object.entries(parsedResponse.frontend.pages).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(pagesDir, filename), content);
                });
                // Save frontend utils
                const frontendUtilsDir = path_1.default.join(frontendDir, "utils");
                if (!fs_1.default.existsSync(frontendUtilsDir)) {
                    fs_1.default.mkdirSync(frontendUtilsDir, { recursive: true });
                }
                Object.entries(parsedResponse.frontend.utils).forEach(([filename, content]) => {
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
                Object.entries(parsedResponse.backend.controllers).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(controllersDir, filename), content);
                });
                // Save backend models
                const modelsDir = path_1.default.join(backendDir, "models");
                if (!fs_1.default.existsSync(modelsDir)) {
                    fs_1.default.mkdirSync(modelsDir, { recursive: true });
                }
                Object.entries(parsedResponse.backend.models).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(modelsDir, filename), content);
                });
                // Save backend routes
                const routesDir = path_1.default.join(backendDir, "routes");
                if (!fs_1.default.existsSync(routesDir)) {
                    fs_1.default.mkdirSync(routesDir, { recursive: true });
                }
                Object.entries(parsedResponse.backend.routes).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(routesDir, filename), content);
                });
                // Save backend utils
                const backendUtilsDir = path_1.default.join(backendDir, "utils");
                if (!fs_1.default.existsSync(backendUtilsDir)) {
                    fs_1.default.mkdirSync(backendUtilsDir, { recursive: true });
                }
                Object.entries(parsedResponse.backend.utils).forEach(([filename, content]) => {
                    fs_1.default.writeFileSync(path_1.default.join(backendUtilsDir, filename), content);
                });
                // Save documentation
                fs_1.default.writeFileSync(path_1.default.join(projectDir, "README.md"), parsedResponse.documentation);
            }
            res.json(parsedResponse);
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
