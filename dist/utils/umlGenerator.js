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
exports.generateUmlFromPrompt = void 0;
exports.parseUMLResponse = parseUMLResponse;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const generateUmlFromPrompt = (prompt) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const completion = yield openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: `You are a UML diagram expert. Generate comprehensive UML diagrams in Mermaid syntax for the given system description.
          Return all diagrams in this format:

          \`\`\`mermaid
          classDiagram
          [Your class diagram here showing class relationships and attributes]
          \`\`\`

          \`\`\`mermaid
          sequenceDiagram
          [Your sequence diagram here showing key system interactions and flow]
          \`\`\`

          \`\`\`mermaid
          erDiagram
          [Your entity relationship diagram here showing data model]
          \`\`\`

          \`\`\`mermaid
          flowchart TB
          [Your component diagram here showing system architecture]
          \`\`\`

          Follow these rules:
          1. Use proper Mermaid syntax for each diagram type
          2. Include all essential components and relationships
          3. Keep diagrams clean and readable
          4. Use descriptive labels for relationships
          5. Return ONLY the diagrams with no additional text or explanations
          6. Generate all diagram types that are relevant to the system description`
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
        console.log("[UML Generator] Received OpenAI response:", response);
        // Use the robust parser
        const diagrams = parseUMLResponse(response);
        console.log("[UML Generator] Parsed diagrams:", diagrams);
        return diagrams;
    }
    catch (error) {
        console.error('[UML Generator] Error generating UML diagrams:', error);
        throw error;
    }
});
exports.generateUmlFromPrompt = generateUmlFromPrompt;
function parseUMLResponse(response) {
    const diagrams = {};
    const regex = /```mermaid\s*([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(response)) !== null) {
        const content = match[1].trim();
        if (content.startsWith("classDiagram")) {
            diagrams.class = content;
        }
        else if (content.startsWith("sequenceDiagram")) {
            diagrams.sequence = content;
        }
        else if (content.startsWith("erDiagram")) {
            diagrams.entity = content;
        }
        else if (content.startsWith("flowchart")) {
            diagrams.component = content;
        }
    }
    return diagrams;
}
