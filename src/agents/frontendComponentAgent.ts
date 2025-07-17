import fs from 'fs/promises';
import path from 'path';
import { CodePlan } from '../utils/umlToCodePlan';
import { anthropic, ANTHROPIC_MODEL, OPENAI_MODEL } from '../config/aiProvider';
import { flattenFileStructure } from '../utils/flattenFileStructure';

/**
 * Clean AI responses that contain markdown code blocks
 */
function cleanAIResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // If the response starts with [ and ends with ], it's likely JSON array
  if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
    return cleaned;
  }
  
  // Try to extract JSON from the response
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // If no JSON found, return empty array
  return '[]';
}

/**
 * Generate complete frontend folder structure and files using enhanced CodePlan
 */
async function generateCompleteFrontendStructure(codePlan: CodePlan, projectPath: string, backendContext?: any) {
  // If we have a complete file structure from the CodePlan, use it directly
  if (codePlan.fileStructure.frontend.length > 0) {
    console.log('[FrontendAgent] Using pre-generated file structure from CodePlan');
    for (const file of codePlan.fileStructure.frontend) {
      const filePath = path.join(projectPath, 'frontend', file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
    return codePlan.fileStructure.frontend;
  }

  // Fallback: Generate files using AI based on components, models, dependencies, and integration
  console.log('[FrontendAgent] Generating frontend structure using AI...');
  
  let backendContextSection = '';
  if (backendContext) {
    backendContextSection = `\n\n**BACKEND API/SCHEMA CONTEXT CONTEXT FOR INTEGRATION:**\n${JSON.stringify(backendContext, null, 2)}`;
  }

  const prompt = `Generate a complete React TypeScript frontend application structure based on the following comprehensive analysis:

**COMPONENTS:**
${JSON.stringify(codePlan.frontendComponents, null, 2)}

**MODELS:**
${JSON.stringify(codePlan.frontendModels, null, 2)}

**DEPENDENCIES:**
${JSON.stringify(codePlan.frontendDependencies, null, 2)}

**INTEGRATION WITH BACKEND:**
${JSON.stringify(codePlan.integration, null, 2)}${backendContextSection}

**CRITICAL REQUIREMENTS:**
- Generate ONLY functional, production-ready code
- NO explanations, comments, or markdown formatting in the content
- NO commented-out code or placeholder content
- NO "TODO" or "FIXME" comments
- Include proper TypeScript interfaces and types based on models
- Use modern React with hooks and functional components
- Include proper imports and dependencies based on dependency analysis
- Add error handling and loading states
- Include responsive design considerations
- Add proper form validation where needed
- Include state management patterns
- Create API service layer that integrates with backend endpoints
- Include proper routing and navigation
- Add authentication flows if specified in integration
- Include proper error boundaries and loading components

**FOLDER STRUCTURE:**
- src/components/ - React components (grouped by feature)
- src/pages/ - Page components
- src/hooks/ - Custom React hooks
- src/utils/ - Utility functions
- src/types/ - TypeScript interfaces (based on models)
- src/services/ - API services (based on integration)
- src/context/ - React context for state management
- src/styles/ - CSS/styling files

**INTEGRATION REQUIREMENTS:**
- Create API service functions for each backend endpoint
- Use proper TypeScript interfaces for API requests/responses
- Include error handling for API calls
- Add loading states for async operations
- Implement proper data flow between components and services

**RESPONSE FORMAT:**
Return a JSON array of file objects with COMPLETE, FUNCTIONAL code:

[
  {
    "path": "src/components/UIComponents/CalculatorPage.tsx",
    "content": "import React, { useState, useEffect } from 'react';\n\ninterface CalculatorProps {\n  // props interface\n}\n\nconst CalculatorPage: React.FC<CalculatorProps> = (props) => {\n  // complete functional component code\n  return (\n    <div>\n      {/* complete JSX */}\n    </div>\n  );\n};\n\nexport default CalculatorPage;",
    "dependencies": ["../utils/calculator", "../types/CalculatorTypes", "../services/api"],
    "description": "Purpose and integration points"
  }
]

**CRITICAL:**
- The "content" field must contain ONLY valid TypeScript/React code
- NO markdown formatting in content
- NO code fences (\`\`\`) in content
- NO explanatory text in content
- NO placeholder comments like "// Complete React component code"
- Generate immediately functional code that compiles and works
- Start each file with proper imports and end with proper exports

Generate ALL necessary files for a complete frontend application. Include:
- Main App component with routing
- API service layer with all endpoints
- Custom hooks for data fetching and state management
- TypeScript interfaces for all models
- Utility functions for common operations
- Error boundaries and loading components
- Authentication components if needed
- Form components with validation
- Navigation and layout components

Return only the JSON array, no explanations.`;

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.7,
    });
    const content = response.content[0];
    if (content.type === 'text') {
      const cleanedResponse = cleanAIResponse(content.text);
      const files = JSON.parse(cleanedResponse);
      // Flatten the file structure in case it's a nested object
      const flatFiles = flattenFileStructure(files);
      for (const file of flatFiles) {
        const filePath = path.join(projectPath, 'frontend', file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }
      return flatFiles;
    } else {
      throw new Error('Unexpected response type from AI');
    }
  } catch (error) {
    console.error('[FrontendAgent] Error generating frontend structure:', error);
    throw error;
  }
}

/**
 * Generate code for a single frontend file/component using the frontend plan and backend context
 */
export async function generateFrontendFile(
  file: { path: string, content?: string, dependencies?: string[], description?: string },
  frontendPlan: any,
  backendContext?: any
): Promise<string> {
  const prompt = `You are an expert frontend developer. Generate the complete, functional TypeScript/React code for the following frontend file as part of a React application. Use the provided frontend plan and backend context for integration.

**FILE TO GENERATE:**
Path: ${file.path}
Description: ${file.description || ''}
Dependencies: ${(file.dependencies || []).join(', ')}

**FRONTEND PLAN CONTEXT:**
${JSON.stringify(frontendPlan, null, 2)}

${backendContext ? `**BACKEND CONTEXT FOR INTEGRATION:**\n${JSON.stringify(backendContext, null, 2)}` : ''}

**CRITICAL REQUIREMENTS:**
- Generate ONLY functional, production-ready code
- NO explanations, comments, or markdown formatting
- NO placeholder or commented-out code
- Use proper imports for all dependencies
- Use TypeScript with proper typing
- Use React functional components and hooks
- Include error handling and validation
- Start with the first import and end with the last export

Return ONLY the code, no explanations, no markdown, no code fences.`;

  const response = await anthropic.messages.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.3,
  });
  const content = response.content[0];
  if (content.type === 'text') {
    return content.text.trim();
  } else {
    throw new Error('No code returned from AI for frontend file');
  }
}

export async function generateFrontendComponents(
  codePlan: CodePlan,
  projectPath: string,
  backendContext?: any
) {
  console.log('[FrontendAgent] Starting enhanced frontend generation...');
  console.log('[FrontendAgent] CodePlan received:', JSON.stringify(codePlan, null, 2));
  if (codePlan.frontendComponents.length === 0 && codePlan.fileStructure.frontend.length === 0) {
    console.log('[FrontendAgent] No frontend components in CodePlan, generating basic structure...');
    // Generate basic structure even if no components
    const basicCodePlan: CodePlan = {
      ...codePlan,
      frontendComponents: [{ name: 'BasicUI', children: ['App', 'Header', 'Main'] }],
      frontendModels: [],
      backendComponents: [],
      backendModels: [],
      frontendDependencies: [],
      backendDependencies: [],
      fileStructure: { frontend: [], backend: [] }
    };
    await generateCompleteFrontendStructure(basicCodePlan, projectPath, backendContext);
    return;
  }
  await generateCompleteFrontendStructure(codePlan, projectPath, backendContext);
  console.log('[FrontendAgent] Enhanced frontend generation completed');
} 