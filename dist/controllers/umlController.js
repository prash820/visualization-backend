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
exports.deleteUmlDiagram = exports.updateUmlDiagram = exports.getUmlDiagram = exports.saveUmlDiagram = exports.generateUmlDiagrams = void 0;
const umlDiagram_1 = require("../models/umlDiagram");
const openai_1 = require("openai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const generateUmlDiagrams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                    content: "You are an AI assistant specialized in generating UML diagrams in PlantUML format."
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
        res.json({ diagram: response });
    }
    catch (error) {
        console.error('Error generating UML diagram:', error);
        res.status(500).json({ error: 'Failed to generate UML diagram' });
    }
});
exports.generateUmlDiagrams = generateUmlDiagrams;
const saveUmlDiagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId, diagramType, diagramData } = req.body;
        if (!projectId || !diagramType || !diagramData) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const diagram = yield umlDiagram_1.UmlDiagram.create({
            projectId,
            diagramType,
            diagramData,
        });
        res.json(diagram);
    }
    catch (error) {
        console.error('Error saving UML diagram:', error);
        res.status(500).json({ error: 'Failed to save UML diagram' });
    }
});
exports.saveUmlDiagram = saveUmlDiagram;
const getUmlDiagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const diagram = yield umlDiagram_1.UmlDiagram.findById(id);
        if (!diagram) {
            res.status(404).json({ error: 'UML diagram not found' });
            return;
        }
        res.json(diagram);
    }
    catch (error) {
        console.error('Error getting UML diagram:', error);
        res.status(500).json({ error: 'Failed to get UML diagram' });
    }
});
exports.getUmlDiagram = getUmlDiagram;
const updateUmlDiagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { diagramData } = req.body;
        if (!diagramData) {
            res.status(400).json({ error: 'Diagram data is required' });
            return;
        }
        const diagram = yield umlDiagram_1.UmlDiagram.findByIdAndUpdate(id, { diagramData }, { new: true });
        if (!diagram) {
            res.status(404).json({ error: 'UML diagram not found' });
            return;
        }
        res.json(diagram);
    }
    catch (error) {
        console.error('Error updating UML diagram:', error);
        res.status(500).json({ error: 'Failed to update UML diagram' });
    }
});
exports.updateUmlDiagram = updateUmlDiagram;
const deleteUmlDiagram = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const diagram = yield umlDiagram_1.UmlDiagram.findByIdAndDelete(id);
        if (!diagram) {
            res.status(404).json({ error: 'UML diagram not found' });
            return;
        }
        res.json({ message: 'UML diagram deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting UML diagram:', error);
        res.status(500).json({ error: 'Failed to delete UML diagram' });
    }
});
exports.deleteUmlDiagram = deleteUmlDiagram;
