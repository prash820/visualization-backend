import { Request, Response } from 'express';
import OpenAI from 'openai';
import { DesignDocument } from '../utils/projectFileStore';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  timeout: 240000, // 4 minutes timeout for OpenAI API calls
});

export const generateDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, umlDiagrams } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Set response headers for long-running request
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Send initial response to keep connection alive
    res.write(JSON.stringify({ status: 'processing', message: 'Generating documentation...' }));

    const designDoc = await generateDesignDocument(prompt, umlDiagrams);
    
    // Send the final response
    res.write(JSON.stringify({ status: 'complete', data: designDoc }));
    res.end();
  } catch (error) {
    console.error('Error generating design document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate design document' });
    } else {
      res.write(JSON.stringify({ status: 'error', error: 'Failed to generate design document' }));
      res.end();
    }
  }
};

async function generateDesignDocument(
  prompt: string,
  umlDiagrams: any
): Promise<DesignDocument> {
  // Read the template file from the dist directory
  const templatePath = path.join(__dirname, '../../dist/templates/designDocumentTemplate.json');
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const template = JSON.parse(templateContent);

  const systemPrompt = `You are an expert software architect. Generate a comprehensive design document for the following application.

The audience is technical stakeholders and engineers who will use this document for implementation and maintenance.

IMPORTANT: You MUST follow the exact template structure provided. Your response must be a valid JSON object that matches the template structure exactly, including all required fields and sections.

Guidelines:
- Use clear, concise, and technical language
- Focus on facts and best practices
- Use bullet points and tables where appropriate
- Each section should be self-contained
- Do NOT include or mention any diagrams; these will be inserted automatically
- Be specific and detailed in each section
- Include concrete examples where relevant
- Use markdown formatting for better readability
- Ensure all sections from the template are included
- Maintain the exact hierarchy and structure of the template
- Do not add or remove any sections from the template

Template Structure:
${JSON.stringify(template, null, 2)}

Your response MUST be a valid JSON object that exactly matches this structure. Do not include any text before or after the JSON object.`;

  console.log('[generateDesignDocument] Calling OpenAI with prompt and UML diagrams...');

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
    ],
    temperature: 0.3, // Reduced temperature for more consistent output
    max_tokens: 4000,
    response_format: { type: "json_object" } // Force JSON response
  });

  let content = response.choices[0].message?.content || '';
  console.log('[generateDesignDocument] AI response preview:', content.split('\n').slice(0, 2).join('\n'));

  try {
    const jsonString = content.replace(/```json|```/g, '').trim();
    const designDoc = JSON.parse(jsonString);
    
    // Validate that all required sections are present
    const requiredSections = [
      'metadata',
      'executive_summary',
      'goals',
      'requirements',
      'proposed_architecture',
      'data_models',
      'api_endpoints',
      'security_considerations',
      'deployment_strategy',
      'testing_strategy',
      'maintenance_and_support',
      'future_enhancements'
    ];

    const missingSections = requiredSections.filter(section => !designDoc[section]);
    if (missingSections.length > 0) {
      throw new Error(`Missing required sections: ${missingSections.join(', ')}`);
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

    return designDoc;
  } catch (e: unknown) {
    console.error('[generateDesignDocument] Failed to parse AI JSON response:', e);
    throw new Error('Failed to parse AI JSON response: ' + (e instanceof Error ? e.message : String(e)));
  }
} 