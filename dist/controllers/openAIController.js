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
exports.generateVisualization = void 0;
// src/controllers/openAIController.ts
const express_1 = __importDefault(require("express"));
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const generateVisualization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { prompt, diagramType } = req.body;
    console.log(`[AI] Generating diagram for prompt: ${prompt} with diagramType: ${diagramType}`);
    // Choose a system prompt based on diagramType
    let systemPrompt = "";
    switch (diagramType) {
        case "flowchart":
            systemPrompt = `
You are an AI assistant specialized in generating flowcharts based on user prompts.
Return only valid JSON with two arrays: "nodes" and "edges".
Each node should have an "id", "label", "role", and a default position.
Each edge should connect nodes using "sourceLabel", "targetLabel" and edge label that says what is happening between steps.
Role means the type of node, like start/end, process, decision, input output, etc
Do not include any extra text.
      `;
            break;
        case "architecture":
            systemPrompt = `You are an AI assistant specialized in generating architecture diagrams based on user prompts with over 10 years of experience.

      Return only valid JSON in the following format:

      json
      Copy
      Edit
      {
        "nodes": [
          {
            "provider": "aws",
            "service": "service_name",          // Service name (e.g., VPC, EC2, S3)
            "label": "Readable Label",          // Human-readable label (e.g., Virtual Private Cloud)
            "group": "Main Group",              // High-level cluster (e.g., AWS, Azure)
            "subgroup": "Sub Group",            // Sub-cluster under the main group (e.g., Networking, Compute)
            "parent": "Parent Node Label",      // Optional: If this node is contained within another (e.g., VPC contains EC2)
            "position": { "x": 0, "y": 0 }      // Optional: Node position
          }
        ],
        "edges": [
          {
            "sourceLabel": "Readable Label",    // Matches the label field in nodes
            "targetLabel": "Readable Label",    // Matches the label field in nodes
            "label": "Optional Edge Label"      // Optional: Label for the edge
          }
        ]
      }
      Rules:
      Ensure "provider" is always "aws" and that "service" is one of AWS's official products.
      Use "group" for high-level clusters (e.g., AWS) and "subgroup" for service categories (e.g., Networking, Compute).
      Utilize the "parent" field to represent hierarchical relationships (e.g., VPC → Subnet → EC2).
      Maintain connections across clusters, sub-clusters, and parent-child nodes using accurate edges.
      Do not include any extra text, commentary, or explanations — only the JSON output.  `;
            break;
        case "sequence":
            systemPrompt = `
You are an AI assistant specialized in generating sequence diagrams based on user prompts.
Return only valid JSON with two arrays: "nodes" and "edges".
Nodes represent actors or steps, and edges represent the flow of interactions.
Format example:
{
  "nodes": [{ "label": "Actor or Step" }],
  "edges": [{ "sourceLabel": "Label", "targetLabel": "Label", "label": "Message" }]
}
Do not include any extra text.
      `;
            break;
        case "uml":
            systemPrompt = `
You are an AI assistant specialized in generating UML class diagrams based on user prompts.
Return only valid JSON with two arrays: "nodes" and "edges".
Each node represents a class (with a "label"), and edges represent relationships between classes.
Format example:
{
  "nodes": [{ "label": "ClassName" }],
  "edges": [{ "sourceLabel": "ClassName", "targetLabel": "ClassName", "label": "Relationship" }]
}
Do not include any extra text.
      `;
            break;
        default:
            systemPrompt = `
You are an AI assistant specialized in generating diagrams based on user prompts.
Return only valid JSON with two arrays: "nodes" and "edges". Do not include any extra text.
      `;
    }
    try {
        console.log("System Prompt " + systemPrompt);
        const response = yield openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            max_tokens: 700,
        });
        const fullResponse = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        // Remove markdown formatting (backticks) and extract JSON.
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return res.status(400).json({ error: "Invalid JSON response from AI" });
        }
        console.log("AI Response:", jsonMatch[0]);
        const diagramJson = JSON.parse(jsonMatch[0]);
        return res.json({ nodes: diagramJson.nodes, edges: diagramJson.edges });
    }
    catch (error) {
        console.error("Error generating visualization:", error);
        return res.status(500).json({ error: "Failed to generate diagram." });
    }
});
exports.generateVisualization = generateVisualization;
