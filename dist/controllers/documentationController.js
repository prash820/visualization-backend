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
exports.generateDocumentation = void 0;
const openai_1 = __importDefault(require("openai"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "",
});
const generateDocumentation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { prompt, umlDiagrams } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const designDoc = yield generateDesignDocument(prompt, umlDiagrams);
        res.json(designDoc);
    }
    catch (error) {
        console.error('Error generating design document:', error);
        res.status(500).json({ error: 'Failed to generate design document' });
    }
});
exports.generateDocumentation = generateDocumentation;
function generateDesignDocument(prompt, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Read the template file from the dist directory
        const templatePath = path_1.default.join(__dirname, '../../dist/templates/designDocumentTemplate.json');
        const templateContent = yield promises_1.default.readFile(templatePath, 'utf-8');
        const template = JSON.parse(templateContent);
        const systemPrompt = `You are an expert software architect. Generate a comprehensive design document for the following application.

The audience is technical stakeholders and engineers who will use this document for implementation and maintenance.

Guidelines:
- Use clear, concise, and technical language
- Focus on facts and best practices
- Use bullet points and tables where appropriate
- Each section should be self-contained
- Do NOT include or mention any diagrams; these will be inserted automatically
- Be specific and detailed in each section
- Include concrete examples where relevant
- Follow the exact structure provided in the template
- Fill in all sections with relevant information
- Use markdown formatting for better readability

Template Structure:
${JSON.stringify(template, null, 2)}

Respond ONLY with a valid JSON object that follows this exact structure.`;
        console.log('[generateDesignDocument] Calling OpenAI with prompt and UML diagrams...');
        const response = yield openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
            ],
            temperature: 0.5,
            max_tokens: 4000
        });
        let content = ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || '';
        console.log('[generateDesignDocument] AI response preview:', content.split('\n').slice(0, 2).join('\n'));
        try {
            const jsonString = content.replace(/```json|```/g, '').trim();
            const designDoc = JSON.parse(jsonString);
            // Add metadata
            designDoc.metadata = {
                title: "System Design Document",
                authors: ["AI Assistant"],
                date_created: new Date().toISOString(),
                date_updated: new Date().toISOString(),
                reviewers: [],
                version: "1.0",
                status: "Draft",
                document_scope: "Complete system design and implementation details"
            };
            return designDoc;
        }
        catch (e) {
            console.error('[generateDesignDocument] Failed to parse AI JSON response:', e);
            throw new Error('Failed to parse AI JSON response');
        }
    });
}
