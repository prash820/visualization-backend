import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import {
  createOrUpdateProjectDocumentation,
  getProjectDocumentation,
  updateProjectDocumentation,
  deleteProjectDocumentation,
  getProjectById
} from '../utils/projectFileStore';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  timeout: 240000, // 4 minutes timeout for OpenAI API calls
});

const MAX_RETRIES = 3;

// Helper function to extract structure information from template
function getTemplateStructure(template: any): Record<string, { type: string; required: string[] }> {
  const structure: Record<string, { type: string; required: string[] }> = {};
  
  for (const [key, value] of Object.entries(template)) {
    if (Array.isArray(value)) {
      structure[key] = { type: 'array', required: [] };
    } else if (typeof value === 'object' && value !== null) {
      structure[key] = {
        type: 'object',
        required: Object.keys(value)
      };
    } else {
      structure[key] = { type: typeof value, required: [] };
    }
  }
  
  return structure;
}

export const generateDocumentation = async (req: Request, res: Response): Promise<void> => {
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
    const project = await createOrUpdateProjectDocumentation(projectId, prompt, umlDiagrams);
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
  } catch (error) {
    console.error('Error initiating documentation generation:', error);
    res.status(500).json({ error: 'Failed to initiate documentation generation' });
  }
};

export const getDocumentationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }
    const documentation = await getProjectDocumentation(projectId as string);
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
  } catch (error) {
    console.error('Error getting documentation status:', error);
    res.status(500).json({ error: 'Failed to get documentation status' });
  }
};

export const getProjectDocumentationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    // Attach umlDiagramsSvg to the documentation object
    const documentation = project.documentation
      ? { ...project.documentation, umlDiagramsSvg: project.umlDiagramsSvg }
      : null;
    console.log('[getProjectDocumentationHandler] documentation:', documentation?.umlDiagramsSvg);
    res.json(documentation);
  } catch (error) {
    console.error('Error getting project documentation:', error);
    res.status(500).json({ error: 'Failed to get project documentation' });
  }
};

export const deleteProjectDocumentationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }
    const success = await deleteProjectDocumentation(projectId as string);
    if (!success) {
      res.status(404).json({ error: 'Documentation not found' });
      return;
    }
    res.json({ message: 'Documentation deleted successfully' });
  } catch (error) {
    console.error('Error deleting documentation:', error);
    res.status(500).json({ error: 'Failed to delete documentation' });
  }
};

async function processDocumentationGeneration(
  projectId: string,
  prompt: string,
  umlDiagrams: any,
  retryCount = 0
): Promise<void> {
  try {
    // Update documentation status to processing
    await updateProjectDocumentation(projectId, {
      status: 'processing',
      progress: 0
    });

    // Read the template file from the dist directory
    const templatePath = path.join(__dirname, '../../dist/templates/designDocumentTemplate.json');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = JSON.parse(templateContent);
    const templateStructure = getTemplateStructure(template);

    // Update progress
    await updateProjectDocumentation(projectId, {
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
    await updateProjectDocumentation(projectId, {
      status: 'processing',
      progress: 40
    });

    console.log('[generateDesignDocument] Calling OpenAI with prompt and UML diagrams...');

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
      ],
      temperature: 0.2,
      max_tokens: 4000
    });

    // Update progress
    await updateProjectDocumentation(projectId, {
      status: 'processing',
      progress: 80
    });

    let content = response.choices[0].message?.content || '';
    console.log('[generateDesignDocument] AI response preview:', content.split('\n').slice(0, 2).join('\n'));
    console.log('[generateDesignDocument] typeof content:', typeof content);
    // Enforce Markdown output only, with fallback
    let markdownContent = content;
    try {
      if (typeof content === "string" && content.trim().startsWith("{")) {
        // AI returned JSON instead of Markdown, try to convert
        const obj = JSON.parse(content);
        // Improved JSON-to-Markdown converter
        function jsonToMarkdown(obj: any, level = 2): string {
          let md = '';
          for (const key in obj) {
            const value = obj[key];
            md += `\n${'#'.repeat(level)} ${key.replace(/_/g, ' ')}\n\n`;
            if (Array.isArray(value)) {
              value.forEach((item) => {
                if (typeof item === 'object' && item !== null) {
                  // Render object as a sub-list of key-value pairs
                  md += `- ` + Object.entries(item).map(([k, v]) => `**${k}**: ${v}`).join(', ') + `\n`;
                } else {
                  md += `- ${item}\n`;
                }
              });
              md += '\n';
            } else if (typeof value === 'object' && value !== null) {
              md += jsonToMarkdown(value, level + 1);
            } else {
              md += `${value}\n\n`;
            }
          }
          return md;
        }
        markdownContent = jsonToMarkdown(obj);
        console.log('[generateDesignDocument] Fallback: converted JSON to Markdown.');
      }
    } catch (e) {
      console.error("Error: AI did not return Markdown and fallback conversion failed. Please update the prompt.");
      await updateProjectDocumentation(projectId, {
        status: 'failed',
        progress: 100,
        error: 'AI did not return Markdown and fallback conversion failed. Please update the prompt.',
      });
      return;
    }

    // Store the markdown result directly
    await updateProjectDocumentation(projectId, {
      status: 'completed',
      progress: 100,
      result: markdownContent
    });

  } catch (error) {
    console.error('Error in documentation generation:', error);
    await updateProjectDocumentation(projectId, {
      status: 'failed',
      progress: 100,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 