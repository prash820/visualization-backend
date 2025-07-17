// src/utils/umlToCodePlan.ts
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';

/**
 * Enhanced CodePlan type: output of the UML parser with complete structure
 */
export interface CodePlan {
  // Component structure with descriptions
  frontendComponents: Array<{ 
    name: string; 
    children: string[]; 
    description?: string;
  }>;
  backendComponents: Array<{ 
    name: string; 
    children: string[]; 
    description?: string;
  }>;
  
  // Model structure from class diagrams with descriptions
  frontendModels: Array<{ 
    name: string; 
    properties: string[]; 
    methods: string[]; 
    description?: string;
  }>;
  backendModels: Array<{ 
    name: string; 
    properties: string[]; 
    methods: string[]; 
    description?: string;
  }>;
  
  // Dependencies and relationships from sequence diagrams with descriptions
  frontendDependencies: Array<{ 
    from: string; 
    to: string; 
    type: string; 
    description?: string;
  }>;
  backendDependencies: Array<{ 
    from: string; 
    to: string; 
    type: string; 
    description?: string;
  }>;
  
  // Complete file structure with paths, content, dependencies, and descriptions
  fileStructure: {
    frontend: Array<{ 
      path: string; 
      content: string; 
      dependencies: string[]; 
      description?: string;
      type?: 'frontend';
    }>;
    backend: Array<{ 
      path: string; 
      content: string; 
      dependencies: string[]; 
      description?: string;
      type?: 'backend';
    }>;
  };
  
  // Alternative project structure (used by some backend plans)
  projectStructure?: {
    src?: {
      controllers?: Record<string, string>;
      services?: Record<string, string>;
      models?: Record<string, string>;
      api?: Record<string, string>;
      config?: Record<string, string>;
      utils?: Record<string, string>;
    };
    test?: {
      controllers?: Record<string, string>;
      services?: Record<string, string>;
    };
  };
  
  // Integration mapping between frontend and backend
  integration?: {
    apiEndpoints: Array<{
      path: string;
      method: string;
      frontendComponent: string;
      backendService: string;
      description?: string;
    }>;
    dataFlow: Array<{
      from: string;
      to: string;
      data: string;
      description?: string;
    }>;
  };
}

/**
 * Clean AI responses that contain markdown code blocks
 */
function cleanAIResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // If the response starts with { and ends with }, it's likely JSON
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    return cleaned;
  }
  
  // Try to extract JSON from the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // If no JSON found, return empty object
  return '{}';
}

/**
 * Safely parse JSON with fallback
 */
function safeJSONParse(text: string, fallback: any = {}): any {
  try {
    const cleaned = cleanAIResponse(text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error(`[umlToCodePlan] JSON parsing error: ${error}`);
    console.error(`[umlToCodePlan] Raw response: ${text}`);
    return fallback;
  }
}

/**
 * AI-powered UML diagram analyzer with complete structure generation
 */
async function analyzeUMLDiagramsWithAI(diagrams: {
  frontendComponentDiagram?: string;
  backendComponentDiagram?: string;
  frontendClassDiagram?: string;
  backendClassDiagram?: string;
  frontendSequenceDiagram?: string;
  backendSequenceDiagram?: string;
}): Promise<CodePlan> {
  console.log('[umlToCodePlan] Starting enhanced AI-powered UML analysis...');
  console.log('[umlToCodePlan] Raw diagrams object:', JSON.stringify(diagrams, null, 2));
  
  // Log which diagrams are present
  Object.entries(diagrams).forEach(([key, value]) => {
    if (value && value.trim()) {
      console.log(`[umlToCodePlan] Found ${key}:`, value.substring(0, 100) + (value.length > 100 ? '...' : ''));
    }
  });
  
  const prompt = `You are an expert software architect and full-stack developer. Analyze the provided UML diagrams and create a comprehensive CodePlan for a complete, production-ready application with proper folder structure, dependencies, and integration.

**ANALYZE ALL 6 DIAGRAM TYPES FOR COMPLETE UNDERSTANDING:**

1. **Frontend Component Diagrams** - Extract UI components, pages, layouts, and component hierarchy
2. **Backend Component Diagrams** - Extract services, controllers, API endpoints, and service architecture  
3. **Frontend Class Diagrams** - Extract frontend models, interfaces, types, and data structures
4. **Backend Class Diagrams** - Extract backend models, entities, services, and business logic classes
5. **Frontend Sequence Diagrams** - Extract frontend component interactions, API calls, and data flows
6. **Backend Sequence Diagrams** - Extract backend service interactions, database operations, and API flows

**GENERATE COMPLETE, INTEGRATED FOLDER STRUCTURE:**

Available diagrams:
${Object.entries(diagrams)
  .filter(([key, content]) => content && content.trim())
  .map(([type, content]) => `${type}: ${content.substring(0, 800)}${content.length > 800 ? '...' : ''}`)
  .join('\n\n')}

Create a comprehensive JSON CodePlan with complete file structure and integration:

{
  "frontendComponents": [
    {
      "name": "ComponentGroupName",
      "children": ["child1", "child2"],
      "description": "Purpose and responsibility"
    }
  ],
  "backendComponents": [
    {
      "name": "ServiceGroupName", 
      "children": ["service1", "service2"],
      "description": "Purpose and responsibility"
    }
  ],
  "frontendModels": [
    {
      "name": "ModelName",
      "properties": ["property1: type", "property2: type"],
      "methods": ["method1(): returnType", "method2(): returnType"],
      "description": "Purpose and usage"
    }
  ],
  "backendModels": [
    {
      "name": "ModelName",
      "properties": ["property1: type", "property2: type"],
      "methods": ["method1(): returnType", "method2(): returnType"],
      "description": "Purpose and usage"
    }
  ],
  "frontendDependencies": [
    {
      "from": "ComponentA",
      "to": "ComponentB",
      "type": "imports|uses|depends_on",
      "description": "Nature of dependency"
    }
  ],
  "backendDependencies": [
    {
      "from": "ServiceA",
      "to": "ServiceB",
      "type": "imports|uses|depends_on",
      "description": "Nature of dependency"
    }
  ],
  "fileStructure": {
    "frontend": [
      {
        "path": "src/components/UIComponents/CalculatorPage.tsx",
        "content": "",
        "dependencies": ["../utils/calculator", "../types/CalculatorTypes", "../services/api"],
        "description": "React component for calculator interface with state management and API integration"
      }
    ],
    "backend": [
      {
        "path": "src/services/CalculatorService.ts",
        "content": "",
        "dependencies": ["../models/Calculator", "../utils/validation", "../middleware/auth"],
        "description": "Service to handle calculator operations with proper error handling and validation"
      }
    ]
  },
  "integration": {
    "apiEndpoints": [
      {
        "path": "/api/calculator/calculate",
        "method": "POST",
        "frontendComponent": "CalculatorPage",
        "backendService": "CalculatorService",
        "description": "Integration flow"
      }
    ],
    "dataFlow": [
      {
        "from": "FrontendComponent",
        "to": "BackendService",
        "data": "Request/Response structure",
        "description": "Data flow description"
      }
    ]
  }
}

**EXTRACTION AND INTEGRATION RULES:**
- Extract ALL subgraphs as component groups with clear responsibilities
- Extract ALL nodes within subgraphs as children with specific purposes
- Extract ALL classes with their properties, methods, and relationships
- Extract ALL sequence flows to determine dependencies and integration points
- Generate complete file paths with proper folder structure and organization
- Include all necessary imports and dependencies based on sequence diagrams
- Use meaningful names from the diagram labels and maintain consistency
- Group related files into logical folders based on component diagrams
- Ensure proper TypeScript/React patterns and best practices
- Create integration points between frontend and backend based on sequence diagrams
- Include error handling, validation, and security based on class diagrams

**FOLDER STRUCTURE GUIDELINES:**
Frontend: src/components/, src/pages/, src/hooks/, src/utils/, src/types/, src/services/, src/context/, src/styles/
Backend: src/controllers/, src/services/, src/models/, src/routes/, src/middleware/, src/utils/, src/config/, src/types/

**INTEGRATION REQUIREMENTS:**
- Map frontend components to backend services based on sequence diagrams
- Create proper API endpoints and data contracts
- Ensure consistent naming and structure across frontend and backend
- Include proper error handling and validation
- Add authentication and authorization where needed
- Include proper TypeScript interfaces for API contracts

**CRITICAL REQUIREMENTS FOR FILE STRUCTURE:**
- The "content" field should be EMPTY ("") - do NOT generate actual code
- Focus on file structure, dependencies, and descriptions only
- The "description" field should contain detailed information about what the file should do
- The "dependencies" field should list all required imports and dependencies
- The "path" field should follow proper folder structure conventions
- Generate comprehensive file structure based on UML diagrams
- Include all necessary files for a complete application
- Ensure proper separation of concerns in file organization

**CRITICAL: For every file in fileStructure.frontend, add "type": "frontend". For every file in fileStructure.backend, add "type": "backend". This field is mandatory and must be present on every file object.**

Return only the JSON object, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message;
    if (content && content.content) {
      const result = safeJSONParse(content.content, {
        frontendComponents: [],
        backendComponents: [],
        frontendModels: [],
        backendModels: [],
        frontendDependencies: [],
        backendDependencies: [],
        fileStructure: {
          frontend: [],
          backend: []
        },
        integration: {
          apiEndpoints: [],
          dataFlow: []
        }
      });

      // Post-process: Ensure every file in fileStructure has a type
      if (result.fileStructure) {
        if (Array.isArray(result.fileStructure.frontend)) {
          result.fileStructure.frontend = result.fileStructure.frontend.map((f: any) => ({ ...f, type: 'frontend' }));
        }
        if (Array.isArray(result.fileStructure.backend)) {
          result.fileStructure.backend = result.fileStructure.backend.map((f: any) => ({ ...f, type: 'backend' }));
        }
      }

      console.log('[umlToCodePlan] Enhanced AI analysis completed successfully');
      
      // Check if the AI analysis returned an empty result
      const hasFrontendFiles = result.fileStructure?.frontend?.length > 0;
      const hasBackendFiles = result.fileStructure?.backend?.length > 0;
      
      if (!hasFrontendFiles && !hasBackendFiles) {
        throw new Error('AI analysis returned empty result. Please provide valid UML diagrams for code generation.');
      }
      
      return result;
    } else {
      throw new Error('Unexpected response type from AI');
    }
  } catch (error: any) {
    console.error('[umlToCodePlan] Error in enhanced AI analysis:', error);
    // Throw error instead of falling back to dummy code
    throw new Error(`AI analysis failed: ${error.message}. Please ensure AI providers are properly configured and UML diagrams are valid.`);
  }
}

/**
 * Main function: parse all diagrams into a comprehensive CodePlan using AI
 */
export async function umlToCodePlan({
  frontendComponentDiagram,
  backendComponentDiagram,
  frontendClassDiagram,
  backendClassDiagram,
  frontendSequenceDiagram,
  backendSequenceDiagram,
}: {
  frontendComponentDiagram?: string;
  backendComponentDiagram?: string;
  frontendClassDiagram?: string;
  backendClassDiagram?: string;
  frontendSequenceDiagram?: string;
  backendSequenceDiagram?: string;
}): Promise<CodePlan> {
  console.log('[umlToCodePlan] Starting enhanced CodePlan generation...');
  console.log('[umlToCodePlan] Input diagrams:');
  console.log('[umlToCodePlan] - frontendComponentDiagram:', frontendComponentDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - backendComponentDiagram:', backendComponentDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - frontendClassDiagram:', frontendClassDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - backendClassDiagram:', backendClassDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - frontendSequenceDiagram:', frontendSequenceDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - backendSequenceDiagram:', backendSequenceDiagram ? 'present' : 'missing');
  
  const diagrams = {
    frontendComponentDiagram,
    backendComponentDiagram,
    frontendClassDiagram,
    backendClassDiagram,
    frontendSequenceDiagram,
    backendSequenceDiagram,
  };
  
  // Check if any diagrams are present
  const hasAnyDiagrams = Object.values(diagrams).some(diagram => diagram && diagram.trim());
  
  if (!hasAnyDiagrams) {
    throw new Error('No UML diagrams provided. Please provide at least one valid UML diagram (frontendComponent, backendComponent, frontendClass, backendClass, frontendSequence, or backendSequence) for code generation.');
  }
  
  const result = await analyzeUMLDiagramsWithAI(diagrams);
  console.log('[umlToCodePlan] Final enhanced CodePlan result:', JSON.stringify(result, null, 2));
  
  // Final safety check: if result is still empty, throw error
  const hasFrontendFiles = result.fileStructure?.frontend?.length > 0;
  const hasBackendFiles = result.fileStructure?.backend?.length > 0;
  
  if (!hasFrontendFiles && !hasBackendFiles) {
    throw new Error('CodePlan generation failed: No files were generated. Please check your UML diagrams and AI configuration.');
  }
  
  return result;
}

/**
 * Generate a frontend-only CodePlan from frontend diagrams
 */
export async function umlToFrontendCodePlan({
  frontendComponentDiagram,
  frontendClassDiagram,
  frontendSequenceDiagram
}: {
  frontendComponentDiagram?: string;
  frontendClassDiagram?: string;
  frontendSequenceDiagram?: string;
}): Promise<Partial<CodePlan>> {
  const diagrams = {
    frontendComponentDiagram,
    frontendClassDiagram,
    frontendSequenceDiagram
  };
  const prompt = `You are an expert frontend architect. Analyze the provided frontend UML diagrams and create a comprehensive CodePlan for a complete, production-ready React/TypeScript frontend application. Only include frontend components, models, dependencies, and file structure. Do NOT include any backend or shared code. Return only the JSON object, no explanations.`;
  // Use the same AI call as before, but with a frontend-focused prompt
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'user', content: prompt },
      { role: 'user', content: JSON.stringify(diagrams) }
    ],
    max_tokens: 6000,
    temperature: 0.3,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI for frontend code plan');
  return safeJSONParse(content, {});
}

/**
 * Generate a backend-only CodePlan from backend diagrams
 */
export async function umlToBackendCodePlan({
  backendComponentDiagram,
  backendClassDiagram,
  backendSequenceDiagram
}: {
  backendComponentDiagram?: string;
  backendClassDiagram?: string;
  backendSequenceDiagram?: string;
}): Promise<Partial<CodePlan>> {
  console.log('[umlToBackendCodePlan] Starting backend-only CodePlan generation...');
  console.log('[umlToBackendCodePlan] Input diagrams:');
  console.log('[umlToBackendCodePlan] - backendComponentDiagram:', backendComponentDiagram ? 'present' : 'missing');
  console.log('[umlToBackendCodePlan] - backendClassDiagram:', backendClassDiagram ? 'present' : 'missing');
  console.log('[umlToBackendCodePlan] - backendSequenceDiagram:', backendSequenceDiagram ? 'present' : 'missing');
  
  const diagrams = {
    backendComponentDiagram,
    backendClassDiagram,
    backendSequenceDiagram
  };
  
  // Check if any backend diagrams are present
  const hasAnyBackendDiagrams = Object.values(diagrams).some(diagram => diagram && diagram.trim());
  
  if (!hasAnyBackendDiagrams) {
    console.log('[umlToBackendCodePlan] No backend UML diagrams provided, generating basic Lambda backend CodePlan...');
    return {
      backendComponents: [{ name: 'LambdaAPI', children: ['Handler', 'Router', 'Controller'], description: 'Basic Lambda backend API structure' }],
      backendModels: [],
      backendDependencies: [],
      fileStructure: {
        frontend: [],
        backend: [
          {
            path: 'src/index.ts',
            content: 'import express from "express";\nimport serverless from "serverless-http";\nimport cors from "cors";\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\n// Routes here\n\nexport const handler = serverless(app);\nexport default app;',
            dependencies: ['express', 'serverless-http', 'cors'],
            description: 'Basic Lambda entry point with Express app wrapped in serverless-http',
            type: 'backend'
          }
        ]
      },
      integration: {
        apiEndpoints: [],
        dataFlow: []
      }
    };
  }
  
  const prompt = `You are an expert backend architect specializing in AWS Lambda and serverless architecture. Analyze the provided backend UML diagrams and create a comprehensive CodePlan for a complete, production-ready Node.js/TypeScript backend application that will be deployed as AWS Lambda functions.

**ANALYZE BACKEND DIAGRAMS FOR LAMBDA DEPLOYMENT:**
1. **Backend Component Diagrams** - Extract services, controllers, API endpoints, and service architecture for Lambda hosting
2. **Backend Class Diagrams** - Extract backend models, entities, services, and business logic classes optimized for serverless
3. **Backend Sequence Diagrams** - Extract backend service interactions, database operations, and API flows for Lambda execution

**AVAILABLE DIAGRAMS:**
${Object.entries(diagrams)
  .filter(([key, content]) => content && content.trim())
  .map(([type, content]) => `${type}: ${content?.substring(0, 800)}${content && content.length > 800 ? '...' : ''}`)
  .join('\n\n')}

Create a comprehensive JSON CodePlan with complete Lambda-native backend structure:

{
  "backendComponents": [
    {
      "name": "ServiceGroupName", 
      "children": ["service1", "service2"],
      "description": "Purpose and responsibility for Lambda execution"
    }
  ],
  "backendModels": [
    {
      "name": "ModelName",
      "properties": ["property1: type", "property2: type"],
      "methods": ["method1(): returnType", "method2(): returnType"],
      "description": "Purpose and usage in Lambda context"
    }
  ],
  "backendDependencies": [
    {
      "from": "ServiceA",
      "to": "ServiceB",
      "type": "imports|uses|depends_on",
      "description": "Nature of dependency for Lambda execution"
    }
  ],
  "fileStructure": {
    "frontend": [],
    "backend": [
      {
        "path": "src/index.ts",
        "content": "",
        "dependencies": ["express", "serverless-http", "cors", "helmet", "morgan"],
        "description": "Lambda entry point with Express app wrapped in serverless-http, exports handler function for AWS Lambda deployment",
        "type": "backend"
      },
      {
        "path": "src/services/CalculatorService.ts",
        "content": "",
        "dependencies": ["../models/Calculator", "../utils/validation", "../middleware/auth"],
        "description": "Service to handle calculator operations optimized for Lambda cold starts with proper error handling and validation",
        "type": "backend"
      }
    ]
  },
  "integration": {
    "apiEndpoints": [
      {
        "path": "/api/calculator/calculate",
        "method": "POST",
        "frontendComponent": "",
        "backendService": "CalculatorService",
        "description": "Lambda API endpoint integration flow"
      }
    ],
    "dataFlow": [
      {
        "from": "BackendService",
        "to": "Database",
        "data": "Request/Response structure",
        "description": "Data flow description for Lambda execution"
      }
    ]
  }
}

**LAMBDA-SPECIFIC EXTRACTION AND INTEGRATION RULES:**
- Extract ALL subgraphs as component groups optimized for Lambda execution
- Extract ALL nodes within subgraphs as children with specific purposes for serverless deployment
- Extract ALL classes with their properties, methods, and relationships optimized for Lambda cold starts
- Extract ALL sequence flows to determine dependencies and integration points for Lambda execution
- Generate complete file paths with proper folder structure for Lambda deployment
- Include all necessary imports and dependencies based on sequence diagrams for serverless execution
- Use meaningful names from the diagram labels and maintain consistency for Lambda deployment
- Group related files into logical folders based on component diagrams for Lambda organization
- Ensure proper TypeScript/Node.js patterns and best practices for Lambda execution
- Include error handling, validation, and security based on class diagrams for Lambda context

**LAMBDA ENTRY POINT REQUIREMENT:**
- You MUST include "src/index.ts" as the main Lambda entry point in fileStructure.backend
- This file must be the first file in the backend array
- The description should specify it's the Lambda entry point with Express app wrapped in serverless-http
- Include all necessary dependencies: express, serverless-http, cors, helmet, morgan, and any route/middleware imports
- The description should mention: Lambda handler export, serverless-http wrapper, middleware setup, route registration, error handling for Lambda context
- NO app.listen() - use serverless-http handler instead

**LAMBDA-SPECIFIC REQUIREMENTS:**
- The "content" field should be EMPTY ("") - do NOT generate actual code
- Focus on file structure, dependencies, and descriptions optimized for Lambda deployment
- The "description" field should contain detailed information about what the file should do in Lambda context
- The "dependencies" field should list all required imports and dependencies for Lambda execution
- The "path" field should follow proper folder structure conventions for Lambda deployment
- All services should be optimized for Lambda cold starts and serverless execution
- Include Lambda-specific patterns: handler functions, serverless-http, APIGatewayProxyEvent handling

**LAMBDA FOLDER STRUCTURE GUIDELINES:**
Backend: src/controllers/, src/services/, src/models/, src/routes/, src/middleware/, src/utils/, src/config/, src/types/, src/lambda/

**CRITICAL: For every file in fileStructure.backend, add "type": "backend". This field is mandatory and must be present on every file object.**

Return only the JSON object, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message;
    if (content && content.content) {
      const result = safeJSONParse(content.content, {
        backendComponents: [],
        backendModels: [],
        backendDependencies: [],
        fileStructure: {
          frontend: [],
          backend: []
        },
        integration: {
          apiEndpoints: [],
          dataFlow: []
        }
      });

      // Post-process: Ensure every file in fileStructure has a type
      if (result.fileStructure && Array.isArray(result.fileStructure.backend)) {
        result.fileStructure.backend = result.fileStructure.backend.map((f: any) => ({ ...f, type: 'backend' }));
      }

      console.log('[umlToBackendCodePlan] Backend AI analysis completed successfully');
      
      // Check if the AI analysis returned an empty result
      const hasBackendFiles = result.fileStructure?.backend?.length > 0;
      const hasBackendComponents = result.backendComponents?.length > 0;
      
      if (!hasBackendFiles && !hasBackendComponents) {
        console.log('[umlToBackendCodePlan] AI analysis returned empty result, generating basic Lambda backend structure...');
        return {
          backendComponents: [{ name: 'LambdaAPI', children: ['Handler', 'Router', 'Controller'], description: 'Basic Lambda backend API structure' }],
          backendModels: [],
          backendDependencies: [],
          fileStructure: {
            frontend: [],
            backend: [
              {
                path: 'src/index.ts',
                content: '',
                dependencies: ['express', 'serverless-http', 'cors', 'helmet', 'morgan'],
                description: 'Lambda entry point with Express app wrapped in serverless-http, exports handler function for AWS Lambda deployment',
                type: 'backend'
              }
            ]
          },
          integration: {
            apiEndpoints: [],
            dataFlow: []
          }
        };
      }
      
      return result;
    } else {
      throw new Error('Unexpected response type from AI');
    }
  } catch (error: any) {
    console.error('[umlToBackendCodePlan] Error in backend AI analysis:', error);
    console.log('[umlToBackendCodePlan] Falling back to basic Lambda backend structure...');
    return {
      backendComponents: [{ name: 'LambdaAPI', children: ['Handler', 'Router', 'Controller'], description: 'Basic Lambda backend API structure' }],
      backendModels: [],
      backendDependencies: [],
      fileStructure: {
        frontend: [],
        backend: [
          {
            path: 'src/index.ts',
            content: '',
            dependencies: ['express', 'serverless-http', 'cors', 'helmet', 'morgan'],
            description: 'Lambda entry point with Express app wrapped in serverless-http, exports handler function for AWS Lambda deployment',
            type: 'backend'
          }
        ]
      },
      integration: {
        apiEndpoints: [],
        dataFlow: []
      }
    };
  }
}

// Legacy functions for backward compatibility (now deprecated)
export function parseMermaidClassDiagram(diagram: string): any[] {
  console.warn('[umlToCodePlan] parseMermaidClassDiagram is deprecated, use AI-powered analysis instead');
  return [];
}

export function parseMermaidComponentDiagram(diagram: string): CodePlan['frontendComponents'] {
  console.warn('[umlToCodePlan] parseMermaidComponentDiagram is deprecated, use AI-powered analysis instead');
  return [];
}

export function parseMermaidStateDiagram(diagram: string): any[] {
  console.warn('[umlToCodePlan] parseMermaidStateDiagram is deprecated, use AI-powered analysis instead');
  return [];
}

export function parseMermaidSequenceDiagram(diagram: string): any[] {
  console.warn('[umlToCodePlan] parseMermaidSequenceDiagram is deprecated, use AI-powered analysis instead');
  return [];
}

export function parseMermaidActivityDiagram(diagram: string): any[] {
  console.warn('[umlToCodePlan] parseMermaidActivityDiagram is deprecated, use AI-powered analysis instead');
  return [];
} 