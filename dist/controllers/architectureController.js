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
exports.generateArchitectureDiagram = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const generateArchitectureDiagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { prompt } = req.body;
    console.log("[Architecture Controller] Generating diagram for prompt:", prompt);
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
                    content: `You are an AI assistant specialized in generating cloud architecture diagrams.
          Return only valid JSON with two arrays: "nodes" and "edges".
          Each node should have:
          - id: unique identifier
          - type: node type (e.g., "default", "input", "output")
          - position: { x: number, y: number }
          - data: { label: string, [key: string]: any }
          
          Each edge should have:
          - id: unique identifier
          - source: source node id
          - target: target node id
          - label: optional description
          
          Example format:
          {
            "nodes": [
              {
                "id": "node1",
                "type": "default",
                "position": { "x": 100, "y": 100 },
                "data": { "label": "API Gateway" }
              }
            ],
            "edges": [
              {
                "id": "edge1",
                "source": "node1",
                "target": "node2",
                "label": "invokes"
              }
            ]
          }
          
          Do not include any extra text.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
        });
        const response = (_a = completion.choices[0].message) === null || _a === void 0 ? void 0 : _a.content;
        if (!response) {
            throw new Error('No response from OpenAI');
        }
        console.log("[Architecture Controller] Received OpenAI response:", response);
        try {
            const parsedData = JSON.parse(response);
            console.log("[Architecture Controller] Parsed data:", {
                nodes: (_b = parsedData.nodes) === null || _b === void 0 ? void 0 : _b.length,
                edges: (_c = parsedData.edges) === null || _c === void 0 ? void 0 : _c.length,
            });
            res.json(parsedData);
        }
        catch (parseError) {
            console.error("[Architecture Controller] Error parsing response:", parseError);
            throw new Error("Invalid JSON response from OpenAI");
        }
    }
    catch (error) {
        console.error('[Architecture Controller] Error generating diagram:', error);
        res.status(500).json({ error: 'Failed to generate architecture diagram' });
    }
});
exports.generateArchitectureDiagram = generateArchitectureDiagram;
