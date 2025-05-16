import { Request, Response } from 'express';
import OpenAI from 'openai';
import { DesignDocument } from '../utils/projectFileStore';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const generateDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, umlDiagrams } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const designDoc = await generateDesignDocument(prompt, umlDiagrams);
    res.json(designDoc);
  } catch (error) {
    console.error('Error generating design document:', error);
    res.status(500).json({ error: 'Failed to generate design document' });
  }
};

async function generateDesignDocument(
  prompt: string,
  umlDiagrams: any
): Promise<DesignDocument> {
  // Read the template file
  const templatePath = path.join(__dirname, '../templates/designDocumentTemplate.json');
  const templateContent = await fs.readFile(templatePath, 'utf-8');
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

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
    ],
    temperature: 0.5,
    max_tokens: 4000
  });

  let content = response.choices[0].message?.content || '';
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
  } catch (e) {
    console.error('[generateDesignDocument] Failed to parse AI JSON response:', e);
    throw new Error('Failed to parse AI JSON response');
  }
} 