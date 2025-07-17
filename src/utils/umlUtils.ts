import fs from 'fs/promises';
import path from 'path';
import { openai, OPENAI_MODEL } from '../config/aiProvider';

export async function loadUmlDiagrams(projectId: string): Promise<any> {
  // Example: load diagrams from a JSON file in the project folder
  const diagramsPath = path.join(process.cwd(), 'generated-projects', projectId, 'umlDiagrams.json');
  try {
    const data = await fs.readFile(diagramsPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    throw new Error(`Failed to load UML diagrams for project ${projectId}: ${err}`);
  }
}

export async function analyzeBackendUml(backendUml: any): Promise<any> {
  const prompt = `You are an expert backend architect. Analyze the following backend UML diagrams and generate a comprehensive backend plan (services, models, API endpoints, file structure, etc) as a JSON object. Return only the JSON object, no explanations.\n\n${JSON.stringify(backendUml, null, 2)}`;
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 6000,
    temperature: 0.3,
  });
  const content = response.choices[0]?.message;
  if (content && content.content) {
    return JSON.parse(content.content);
  } else {
    throw new Error('No backend plan returned from OpenAI');
  }
}

export async function analyzeFrontendUml(frontendUml: any, backendApiSchema: any): Promise<any> {
  const prompt = `You are an expert frontend architect. Analyze the following frontend UML diagrams and backend API schema, and generate a comprehensive frontend plan (components, models, file structure, etc) as a JSON object. Return only the JSON object, no explanations.\n\nFRONTEND UML:\n${JSON.stringify(frontendUml, null, 2)}\n\nBACKEND API SCHEMA:\n${JSON.stringify(backendApiSchema, null, 2)}`;
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 6000,
    temperature: 0.3,
  });
  const content = response.choices[0]?.message;
  if (content && content.content) {
    return JSON.parse(content.content);
  } else {
    throw new Error('No frontend plan returned from OpenAI');
  }
} 