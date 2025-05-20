import { Request, Response } from 'express';
import OpenAI from 'openai';
import { DesignDocument } from '../utils/projectFileStore';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  createDocumentation,
  getDocumentationById,
  updateDocumentation,
  getDocumentationsByProjectId,
  deleteDocumentation,
  Documentation
} from '../utils/documentationStore';

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

    // Create documentation record
    const documentation = await createDocumentation(projectId, prompt, umlDiagrams);

    // Start the background job
    processDocumentationGeneration(documentation.id, prompt, umlDiagrams);

    // Return the documentation ID immediately
    res.json({
      status: 'accepted',
      documentationId: documentation.id,
      message: 'Documentation generation started',
      checkStatusUrl: `/api/documentation/status/${documentation.id}`
    });
  } catch (error) {
    console.error('Error initiating documentation generation:', error);
    res.status(500).json({ error: 'Failed to initiate documentation generation' });
  }
};

export const getDocumentationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const documentation = await getDocumentationById(id);

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

export const getProjectDocumentations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const documentations = await getDocumentationsByProjectId(projectId);
    res.json(documentations);
  } catch (error) {
    console.error('Error getting project documentations:', error);
    res.status(500).json({ error: 'Failed to get project documentations' });
  }
};

export const deleteDocumentationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await deleteDocumentation(id);
    
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
  documentationId: string,
  prompt: string,
  umlDiagrams: any,
  retryCount = 0
): Promise<void> {
  try {
    // Update documentation status to processing
    await updateDocumentation(documentationId, {
      status: 'processing',
      progress: 0
    });

    // Read the template file from the dist directory
    const templatePath = path.join(__dirname, '../../dist/templates/designDocumentTemplate.json');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = JSON.parse(templateContent);
    const templateStructure = getTemplateStructure(template);

    // Update progress
    await updateDocumentation(documentationId, {
      status: 'processing',
      progress: 20
    });

    const systemPrompt = `You are an expert software architect. Generate a comprehensive design document for the following application.

The audience is technical stakeholders and engineers who will use this document for implementation and maintenance.

IMPORTANT: You MUST follow the exact template structure provided. Your response must be a valid JSON object that matches the template structure exactly, including ALL required sections and their subsections.

Required Sections and Their Structure:
${Object.entries(templateStructure).map(([section, details]) => `
${section}:
- Type: ${details.type}
${details.required.length > 0 ? `- Required fields: ${details.required.join(', ')}` : ''}
`).join('\n')}

Guidelines:
1. Structure:
   - Each section MUST follow its specified format exactly
   - All required fields must be present and properly filled
   - Use consistent formatting within each section
   - Maintain proper nesting and hierarchy
   - Follow the exact structure from the template

2. Content:
   - Use clear, concise, and technical language
   - Focus on facts and best practices
   - Include specific examples and use cases
   - Use markdown formatting for better readability
   - Do NOT include or mention any diagrams; these will be inserted automatically

3. Formatting:
   - Use bullet points for lists
   - Use tables for structured data
   - Use code blocks for technical specifications
   - Use headers for subsections
   - Maintain consistent indentation

4. Quality:
   - Each section should be self-contained
   - Information should be specific and actionable
   - Include concrete examples where relevant
   - Ensure technical accuracy
   - Maintain professional tone

Template Structure:
${JSON.stringify(template, null, 2)}

Your response MUST be a valid JSON object that exactly matches this structure and includes ALL required sections with their specified fields. Do not include any text before or after the JSON object.`;

    // Update progress
    await updateDocumentation(documentationId, {
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
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    // Update progress
    await updateDocumentation(documentationId, {
      status: 'processing',
      progress: 80
    });

    let content = response.choices[0].message?.content || '';
    console.log('[generateDesignDocument] AI response preview:', content.split('\n').slice(0, 2).join('\n'));

    try {
      const jsonString = content.replace(/```json|```/g, '').trim();
      const designDoc = JSON.parse(jsonString);
      
      // Validate that all required sections and their fields are present
      const missingSections = Object.entries(templateStructure)
        .filter(([section, details]) => {
          if (!designDoc[section]) return true;
          if (details.type === 'object' && details.required.length > 0) {
            return details.required.some(field => !designDoc[section][field]);
          }
          return false;
        })
        .map(([section]) => section);

      if (missingSections.length > 0) {
        if (retryCount < MAX_RETRIES) {
          console.log(`[generateDesignDocument] Missing sections or fields detected. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          return processDocumentationGeneration(documentationId, prompt, umlDiagrams, retryCount + 1);
        }
        throw new Error(`Missing required sections or fields: ${missingSections.join(', ')}`);
      }

      // Add metadata if not present
      if (!designDoc.metadata) {
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
      }

      // Update documentation with success
      await updateDocumentation(documentationId, {
        status: 'completed',
        progress: 100,
        result: designDoc
      });

    } catch (e) {
      console.error('[generateDesignDocument] Failed to parse AI JSON response:', e);
      if (retryCount < MAX_RETRIES) {
        console.log(`[generateDesignDocument] Error occurred. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        return processDocumentationGeneration(documentationId, prompt, umlDiagrams, retryCount + 1);
      }
      
      // Update documentation with error
      await updateDocumentation(documentationId, {
        status: 'failed',
        progress: 100,
        error: 'Failed to parse AI JSON response: ' + (e instanceof Error ? e.message : String(e))
      });
    }
  } catch (error) {
    console.error('Error in documentation generation:', error);
    await updateDocumentation(documentationId, {
      status: 'failed',
      progress: 100,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 