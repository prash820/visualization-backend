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
const aiProvider_1 = require("../config/aiProvider");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const generateArchitectureDiagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { prompt } = req.body;
    console.log("[Architecture Controller] Generating diagram for prompt:", prompt);
    if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
    }
    try {
        const response = yield aiProvider_1.anthropic.messages.create({
            model: aiProvider_1.ANTHROPIC_MODEL,
            max_tokens: 4000,
            temperature: 0.3,
            messages: [{ role: "user", content: prompt }]
        });
        const content = response.content[0];
        const resultText = content.type === 'text' ? content.text : '';
        console.log("[Architecture Controller] Received Anthropic response:", resultText);
        try {
            const parsedData = JSON.parse(resultText);
            console.log("[Architecture Controller] Parsed data:", {
                nodes: (_a = parsedData.nodes) === null || _a === void 0 ? void 0 : _a.length,
                edges: (_b = parsedData.edges) === null || _b === void 0 ? void 0 : _b.length,
            });
            res.json(parsedData);
        }
        catch (parseError) {
            console.error("[Architecture Controller] Error parsing response:", parseError);
            throw new Error("Invalid JSON response from Anthropic");
        }
    }
    catch (error) {
        console.error('[Architecture Controller] Error generating diagram:', error);
        res.status(500).json({ error: 'Failed to generate architecture diagram' });
    }
});
exports.generateArchitectureDiagram = generateArchitectureDiagram;
