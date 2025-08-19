import * as fs from 'fs/promises';
import * as path from 'path';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import { InfrastructureContext } from '../orchestrateAppGeneration';

export async function loadUmlDiagrams(projectId: string): Promise<any> {
  // Load diagrams from projects.json file
  const projectsPath = path.join(process.cwd(), 'projects.json');
  try {
    const data = await fs.readFile(projectsPath, 'utf-8');
    const projects = JSON.parse(data);
    
    // Find the project by ID (check both 'id' and '_id' fields)
    const project = projects.find((p: any) => p.id === projectId || p._id === projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found in projects.json`);
    }
    
    // Return the UML diagrams from the project
    if (!project.umlDiagrams) {
      throw new Error(`No UML diagrams found for project ${projectId}`);
    }
    
    return project.umlDiagrams;
  } catch (err) {
    throw new Error(`Failed to load UML diagrams for project ${projectId}: ${err}`);
  }
}

export async function analyzeBackendUml(backendUml: any, infrastructureContext?: InfrastructureContext): Promise<any> {
  const infrastructureSection = infrastructureContext ? `\n\n**INFRASTRUCTURE CONTEXT FOR INTEGRATION:**\n${JSON.stringify(infrastructureContext, null, 2)}` : '';
  
  const prompt = `You are an expert backend architect. Analyze the following backend UML diagrams and generate a comprehensive backend plan (services, models, API endpoints, file structure, etc) as a JSON object. Use the infrastructure context to ensure the backend connects to real databases and services. Return only the JSON object, no explanations.

**BACKEND UML DIAGRAMS:**
${JSON.stringify(backendUml, null, 2)}${infrastructureSection}`;

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

export async function analyzeFrontendUml(frontendUml: any, backendApiSchema: any, infrastructureContext?: InfrastructureContext): Promise<any> {
  const infrastructureSection = infrastructureContext ? `\n\n**INFRASTRUCTURE CONTEXT FOR API ENDPOINTS:**\n${JSON.stringify(infrastructureContext, null, 2)}` : '';
  
  const prompt = `You are an expert frontend architect. Analyze the following frontend UML diagrams and backend API schema, and generate a comprehensive frontend plan (components, models, file structure, etc) as a JSON object. Use the infrastructure context to ensure the frontend connects to real API endpoints. Return only the JSON object, no explanations.

**FRONTEND UML:**
${JSON.stringify(frontendUml, null, 2)}\n\n**BACKEND API SCHEMA:**\n${JSON.stringify(backendApiSchema, null, 2)}${infrastructureSection}`;

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