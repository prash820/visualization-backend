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
exports.generateIaC = exports.generateVisualization = void 0;
// src/controllers/openAIController.ts
const express_1 = __importDefault(require("express"));
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
const openai = new openai_1.OpenAI({
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
    const { prompt } = req.body;
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    try {
        const completion = yield openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are an AI assistant specialized in generating Infrastructure as Code (IaC) using Terraform."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
        });
        const response = completion.choices[0].message.content;
        if (!response) {
            throw new Error('No response from OpenAI');
        }
        res.json({ code: response });
    }
    catch (error) {
        console.error('Error generating IaC:', error);
        res.status(500).json({ error: 'Failed to generate Infrastructure as Code' });
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
