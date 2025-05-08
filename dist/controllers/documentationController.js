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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocumentation = exports.generateLowLevelDocumentation = exports.generateHighLevelDocumentation = void 0;
const openai_1 = require("openai");
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Separate endpoints for high-level and low-level documentation
const generateHighLevelDocumentation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { prompt, umlDiagrams } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const sections = yield generateHighLevelDesign(prompt, umlDiagrams);
        res.json({ sections });
    }
    catch (error) {
        console.error('Error generating high-level documentation:', error);
        res.status(500).json({ error: 'Failed to generate high-level documentation' });
    }
});
exports.generateHighLevelDocumentation = generateHighLevelDocumentation;
const generateLowLevelDocumentation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { prompt, umlDiagrams } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const sections = yield generateLowLevelDesign(prompt, umlDiagrams);
        res.json({ sections });
    }
    catch (error) {
        console.error('Error generating low-level documentation:', error);
        res.status(500).json({ error: 'Failed to generate low-level documentation' });
    }
});
exports.generateLowLevelDocumentation = generateLowLevelDocumentation;
// Keep the combined endpoint for backward compatibility
const generateDocumentation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { prompt, umlDiagrams } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const documentation = yield generateComprehensiveDocumentation(prompt, umlDiagrams);
        res.json(documentation);
    }
    catch (error) {
        console.error('Error generating documentation:', error);
        res.status(500).json({ error: 'Failed to generate documentation' });
    }
});
exports.generateDocumentation = generateDocumentation;
function generateComprehensiveDocumentation(prompt, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        // Generate both in parallel
        const [highLevelDesign, lowLevelDesign] = yield Promise.all([
            generateHighLevelDesign(prompt, umlDiagrams),
            generateLowLevelDesign(prompt, umlDiagrams)
        ]);
        return {
            highLevel: highLevelDesign,
            lowLevel: lowLevelDesign,
            metadata: {
                generatedAt: new Date().toISOString(),
                prompt
            }
        };
    });
}
function generateHighLevelDesign(prompt, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = `You are an expert enterprise software architect. Generate a comprehensive, objective, and context-rich high-level design document for the following application. 
  The audience is technical stakeholders and engineers who will use this document as a reference for implementation and future maintenance. 
  Avoid subjectivity and personal opinions; focus on facts, standards, and best practices.

Respond ONLY with a valid JSON array. Each element must have a 'title' (string) and 'content' (markdown string). Do not include any text outside the JSON array.

Required sections (in this order):
1. System Overview
2. Architecture Overview
3. Key Components
4. Data Flow
5. Security Considerations
6. Scalability & Performance
7. Integration Points
8. Deployment Strategy

Important:
- Use clear, concise, and technical language
- Do NOT include or mention any diagrams; these will be inserted automatically
- Avoid subjective statements and personal opinions
- Use bullet points and tables where appropriate for clarity
- Each section should be self-contained and comprehensive
- Focus on enterprise-grade solutions and best practices`;
        console.log('[generateHighLevelDesign] Calling OpenAI with prompt and UML diagrams...');
        const response = yield openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
            ],
            temperature: 0.5,
            max_tokens: 2000
        });
        let content = response.choices[0].message.content || '';
        console.log('[generateHighLevelDesign] AI response preview:', content.split('\n').slice(0, 2).join('\n'));
        try {
            const jsonString = content.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonString);
        }
        catch (e) {
            console.error('[generateHighLevelDesign] Failed to parse AI JSON response:', e);
            throw new Error('Failed to parse AI JSON response');
        }
    });
}
function generateLowLevelDesign(prompt, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        const systemPrompt = `You are an expert enterprise software engineer. Generate a comprehensive, objective, and context-rich low-level design document for the following application.

The audience is technical stakeholders and engineers who will use this document for implementation, code reviews, and future maintenance.

Avoid subjectivity and personal opinions; focus on facts, standards, and best practices.

Respond ONLY with a valid JSON array. Each element must have a 'title' (string) and 'content' (markdown string).

Guidelines:
- Start with a brief problem description or system context to set the stage for the design.
- Organize the document into logical sections relevant to the application (e.g., API Specifications, Component Details, Integration Points, Error Handling, Testing Strategy, Performance Optimization, Monitoring & Logging, etc.).
- For the database/ERD section, do NOT list the schema, tables, or entities as text or tables. Instead, provide a concise description or summary of the data model, referencing the ERD diagram that will be rendered separately.
- Use clear, concise, and technical language.
- Do NOT include or mention any diagrams; these will be inserted automatically.
- Avoid subjective statements and personal opinions.
- Use bullet points and tables where appropriate for clarity.
- Each section should be self-contained and comprehensive.
- Focus on enterprise-grade solutions and best practices.
- Include specific technical details and implementation guidelines.
- Add any other sections you deem important for a robust low-level design.
`;
        console.log('[generateLowLevelDesign] Calling OpenAI with prompt and UML diagrams...');
        const response = yield openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
            ],
            temperature: 0.5,
            max_tokens: 2000
        });
        let content = response.choices[0].message.content || '';
        console.log('[generateLowLevelDesign] AI response preview:', content.split('\n').slice(0, 2).join('\n'));
        try {
            const jsonString = content.replace(/```json|```/g, '').trim();
            return JSON.parse(jsonString);
        }
        catch (e) {
            console.error('[generateLowLevelDesign] Failed to parse AI JSON response:', e);
            throw new Error('Failed to parse AI JSON response');
        }
    });
}
