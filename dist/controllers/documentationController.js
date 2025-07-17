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
exports.deleteProjectDocumentationHandler = exports.getProjectDocumentationHandler = exports.getDocumentationStatus = exports.generateDocumentation = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const projectFileStore_1 = require("../utils/projectFileStore");
const aiProvider_1 = require("../config/aiProvider");
const MAX_RETRIES = 3;
// Helper function to extract structure information from template
function getTemplateStructure(template) {
    const structure = {};
    for (const [key, value] of Object.entries(template)) {
        if (Array.isArray(value)) {
            structure[key] = { type: 'array', required: [] };
        }
        else if (typeof value === 'object' && value !== null) {
            structure[key] = {
                type: 'object',
                required: Object.keys(value)
            };
        }
        else {
            structure[key] = { type: typeof value, required: [] };
        }
    }
    return structure;
}
const generateDocumentation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { prompt, umlDiagrams, projectId } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        // Create or update documentation record using the new project-based function
        const project = yield (0, projectFileStore_1.createOrUpdateProjectDocumentation)(projectId, prompt, umlDiagrams);
        if (!project || !project.documentation) {
            res.status(404).json({ error: 'Project not found or documentation not initialized' });
            return;
        }
        // Start the background job
        processDocumentationGeneration(projectId, prompt, umlDiagrams);
        // Return the documentation ID immediately
        res.json({
            status: 'accepted',
            documentationId: project.documentation.id,
            message: 'Documentation generation started',
            checkStatusUrl: `/api/documentation/status/${project.documentation.id}?projectId=${projectId}`
        });
    }
    catch (error) {
        console.error('Error initiating documentation generation:', error);
        res.status(500).json({ error: 'Failed to initiate documentation generation' });
    }
});
exports.generateDocumentation = generateDocumentation;
const getDocumentationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        const documentation = yield (0, projectFileStore_1.getProjectDocumentation)(projectId);
        if (!documentation) {
            res.status(404).json({ error: 'Documentation not found' });
            return;
        }
        res.json({
            id: documentation.id,
            status: documentation.status,
            progress: documentation.progress,
            result: documentation.result,
            error: documentation.error
        });
    }
    catch (error) {
        console.error('Error getting documentation status:', error);
        res.status(500).json({ error: 'Failed to get documentation status' });
    }
});
exports.getDocumentationStatus = getDocumentationStatus;
const getProjectDocumentationHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        const project = yield (0, projectFileStore_1.getProjectById)(projectId);
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        // Attach umlDiagramsSvg to the documentation object
        const documentation = project.documentation || null;
        res.json(documentation);
    }
    catch (error) {
        console.error('Error getting project documentation:', error);
        res.status(500).json({ error: 'Failed to get project documentation' });
    }
});
exports.getProjectDocumentationHandler = getProjectDocumentationHandler;
const deleteProjectDocumentationHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        const success = yield (0, projectFileStore_1.deleteProjectDocumentation)(projectId);
        if (!success) {
            res.status(404).json({ error: 'Documentation not found' });
            return;
        }
        res.json({ message: 'Documentation deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting documentation:', error);
        res.status(500).json({ error: 'Failed to delete documentation' });
    }
});
exports.deleteProjectDocumentationHandler = deleteProjectDocumentationHandler;
function processDocumentationGeneration(projectId_1, prompt_1, umlDiagrams_1) {
    return __awaiter(this, arguments, void 0, function* (projectId, prompt, umlDiagrams, retryCount = 0) {
        try {
            // Update documentation status to processing
            yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                status: 'processing',
                progress: 0
            });
            // Read the template file from the dist directory
            const templatePath = path_1.default.join(__dirname, '../../dist/templates/designDocumentTemplate.json');
            const templateContent = yield promises_1.default.readFile(templatePath, 'utf-8');
            const template = JSON.parse(templateContent);
            const templateStructure = getTemplateStructure(template);
            // Update progress
            yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                status: 'processing',
                progress: 20
            });
            const systemPrompt = `You are an expert software architect. Generate a comprehensive system design document for the following application.

Audience: Technical stakeholders and engineers.

**IMPORTANT:**
- You MUST return ONLY a Markdown document. Do NOT return JSON or any code block with JSON.
- Use clear section headings (##, ###, etc.) for each major section.
- Use bullet points, numbered lists, and tables where appropriate.
- Use code blocks for technical specifications or API contracts.
- Include all sections and subsections from the template below
- Do NOT return JSON—return 
- a well-formatted Markdown document only.

Sections to include:
- Executive Summary
- Goals and Non-Goals
- Proposed Architecture (with components, data models, integrations)
- API Contracts (with endpoints, request/response examples)
- Security Considerations
- Failure Handling & Resilience
- Observability Plan
- Cost Estimation
- Deployment Infrastructure
- Rollout Plan
- Risks & Tradeoffs
- Open Questions
- Appendix

Application Description: ${prompt}
UML Diagrams: ${JSON.stringify(umlDiagrams)}`;
            // Update progress
            yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                status: 'processing',
                progress: 40
            });
            console.log('[generateDesignDocument] Calling OpenAI with prompt and UML diagrams...');
            const response = yield aiProvider_1.anthropic.messages.create({
                model: aiProvider_1.ANTHROPIC_MODEL,
                max_tokens: 4000,
                temperature: 0.3,
                messages: [{ role: "user", content: prompt }]
            });
            const content = response.content[0];
            const resultText = content.type === 'text' ? content.text : '';
            // Update progress
            yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                status: 'processing',
                progress: 80
            });
            let markdownContent = resultText;
            console.log('[generateDesignDocument] AI response preview:', resultText.split('\n').slice(0, 2).join('\n'));
            console.log('[generateDesignDocument] typeof content:', typeof resultText);
            // Enforce Markdown output only, with fallback
            try {
                if (typeof resultText === "string" && resultText.trim().startsWith("{")) {
                    // AI returned JSON instead of Markdown, try to convert
                    const obj = JSON.parse(resultText);
                    // Improved JSON-to-Markdown converter
                    function jsonToMarkdown(obj, level = 2) {
                        let md = '';
                        for (const key in obj) {
                            const value = obj[key];
                            md += `\n${'#'.repeat(level)} ${key.replace(/_/g, ' ')}\n\n`;
                            if (Array.isArray(value)) {
                                value.forEach((item) => {
                                    if (typeof item === 'object' && item !== null) {
                                        // Render object as a sub-list of key-value pairs
                                        md += `- ` + Object.entries(item).map(([k, v]) => `**${k}**: ${v}`).join(', ') + `\n`;
                                    }
                                    else {
                                        md += `- ${item}\n`;
                                    }
                                });
                                md += '\n';
                            }
                            else if (typeof value === 'object' && value !== null) {
                                md += jsonToMarkdown(value, level + 1);
                            }
                            else {
                                md += `${value}\n\n`;
                            }
                        }
                        return md;
                    }
                    markdownContent = jsonToMarkdown(obj);
                    console.log('[generateDesignDocument] Fallback: converted JSON to Markdown.');
                }
            }
            catch (e) {
                console.error("Error: AI did not return Markdown and fallback conversion failed. Please update the prompt.");
                yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                    status: 'failed',
                    progress: 100,
                    error: 'AI did not return Markdown and fallback conversion failed. Please update the prompt.',
                });
                return;
            }
            // Store the markdown result directly
            yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                status: 'completed',
                progress: 100,
                result: markdownContent
            });
        }
        catch (error) {
            console.error('Error in documentation generation:', error);
            yield (0, projectFileStore_1.updateProjectDocumentation)(projectId, {
                status: 'failed',
                progress: 100,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    });
}
