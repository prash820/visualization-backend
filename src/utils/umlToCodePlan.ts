// src/utils/umlToCodePlan.ts
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';

/**
 * Remove any content fields from file structure to ensure structure-only approach
 */
function removeContentFields(fileStructure: any): any {
  if (fileStructure.frontend && Array.isArray(fileStructure.frontend)) {
    fileStructure.frontend = fileStructure.frontend.map((file: any) => {
      const { content, ...fileWithoutContent } = file;
      return fileWithoutContent;
    });
  }
  
  if (fileStructure.backend && Array.isArray(fileStructure.backend)) {
    fileStructure.backend = fileStructure.backend.map((file: any) => {
      const { content, ...fileWithoutContent } = file;
      return fileWithoutContent;
    });
  }
  
  return fileStructure;
}

/**
 * Enhanced CodePlan type: output of the UML parser with complete structure
 * NOTE: This should NOT contain actual code content, only structure and specifications
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
  
  // File structure with paths, dependencies, and descriptions (NO CONTENT)
  fileStructure: {
    frontend: Array<{ 
      path: string; 
      dependencies: string[]; 
      description?: string;
      type?: 'frontend';
      // REMOVED: content: string; - Code plan should not store actual code
    }>;
    backend: Array<{ 
      path: string; 
      dependencies: string[]; 
      description?: string;
      type?: 'backend';
      // REMOVED: content: string; - Code plan should not store actual code
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
      frontendComponent: string | null;
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
  
  // Infrastructure configuration for AWS Lambda and API Gateway
  infrastructure?: {
    lambdaFunction?: {
      name: string;
      runtime: string;
      handler: string;
      environment?: Record<string, string>;
    };
    apiGateway: {
      routes: Array<{
        path: string;
        method: string;
        description?: string;
      }>;
    };
    database?: {
      type: string;
      tables: string[];
    };
    storage?: {
      type: string;
      buckets: string[];
    };
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
 * Ensure index.ts is always included in backend file structure
 */
function ensureIndexTsInBackend(fileStructure: any): any {
  if (!fileStructure.backend) {
    fileStructure.backend = [];
  }
  
  // Check if index.ts already exists in src/ directory
  const hasIndexTs = fileStructure.backend.some((file: any) => 
    file.path === 'src/index.ts' || file.path === 'index.ts'
  );
  
  // If not, add it to src/ directory
  if (!hasIndexTs) {
    fileStructure.backend.unshift({
      path: 'src/index.ts',
      dependencies: [],
      description: 'Main Lambda entry point for the backend application',
      type: 'backend'
    });
    console.log('[umlToCodePlan] Added missing src/index.ts to backend file structure');
  }
  
  return fileStructure;
}

/**
 * AI-powered UML diagram analyzer with STRICT adherence to diagrams
 */
async function analyzeUMLDiagramsWithAI(diagrams: {
  frontendComponentDiagram?: string;
  backendComponentDiagram?: string;
  frontendClassDiagram?: string;
  backendClassDiagram?: string;
  frontendSequenceDiagram?: string;
  backendSequenceDiagram?: string;
}, infrastructureContext?: any, planType: 'frontend' | 'backend' = 'frontend', enhancedPrompt?: string): Promise<CodePlan> {
  console.log(`[umlToCodePlan] Starting LIGHTWEIGHT UML analysis for ${planType}...`);
  // Removed verbose diagrams object logging
  
  // Log which diagrams are present
  Object.entries(diagrams).forEach(([key, value]) => {
    if (value && value.trim()) {
      console.log(`[umlToCodePlan] Found ${key}:`, value.substring(0, 100) + (value.length > 100 ? '...' : ''));
    }
  });
  
  // Build infrastructure section for the prompt
  const infrastructureSection = infrastructureContext ? `\n\n**INFRASTRUCTURE CONTEXT:**\n${JSON.stringify(infrastructureContext, null, 2)}` : '';
  
  // Add semantic context section if enhanced prompt is provided
  const semanticSection = enhancedPrompt ? `\n\n**SEMANTIC CONTEXT:**\n${enhancedPrompt}` : '';
  
  const planTypeSection = planType === 'frontend' ? 
    `**FRONTEND-ONLY:** Generate ONLY frontend components, models, dependencies, and file structure.` :
    `**BACKEND-ONLY:** Generate ONLY backend components, models, dependencies, and file structure.`;
  
  const prompt = `You are an expert software architect. Create a COMPLETE CodePlan for a ${planType} application based on the UML diagrams.${infrastructureSection}${semanticSection}

${planTypeSection}

**CRITICAL REQUIREMENTS:**
1. **STRICT UML ADHERENCE:** Extract EXACTLY what is shown in UML diagrams - NO assumptions, NO additions
2. **STRUCTURE ONLY:** Generate ONLY file structure, dependencies, and specifications - NO actual code content
3. **METHOD SIGNATURE CONSISTENCY:** All method signatures must match EXACTLY across all layers
4. **PROPERTY CONSISTENCY:** All properties must match EXACTLY what's defined in class diagrams
5. **FLAT FILE STRUCTURE:** Use simple, flat file paths without unnecessary nesting
6. **LAMBDA-COMPATIBLE:** For backend, use flat structure suitable for Lambda deployment

**STRICT UML ANALYSIS REQUIREMENTS:**

**FROM CLASS DIAGRAMS - EXACT EXTRACTION:**
- Extract EXACT method signatures as shown (parameters, return types, visibility)
- Extract EXACT properties as shown (names, types, visibility)
- Extract EXACT class relationships and dependencies
- Extract EXACT class names and structure
- DO NOT add properties or methods not shown in the diagram
- DO NOT change method signatures or parameter types
- DO NOT add or remove parameters

**FROM SEQUENCE DIAGRAMS - EXACT FLOW:**
- Extract EXACT method call sequences as shown
- Extract EXACT parameter passing as shown
- Extract EXACT return values as shown
- Extract EXACT error handling as shown
- DO NOT change the flow or add extra steps
- DO NOT modify method names or signatures

**FROM COMPONENT DIAGRAMS - EXACT STRUCTURE:**
- Extract EXACT component names and relationships
- Extract EXACT file structure as shown
- Extract EXACT dependencies as shown
- DO NOT add components not shown in the diagram
- DO NOT change component names or relationships

**FILE STRUCTURE RULES:**
${planType === 'backend' ? `
- Use proper structure: src/index.ts, src/controllers/, src/services/, src/models/, src/repositories/
- Place source files in src/ subdirectory for proper TypeScript compilation
- Use simple imports: import ServiceName from './services/ServiceName'
- Include: src/index.ts, package.json, serverless.yml, tsconfig.json
- CRITICAL: Each file type must be in its correct directory:
  * Controllers: src/controllers/ControllerName.ts
  * Services: src/services/ServiceName.ts
  * Models: src/models/ModelName.ts
  * Repositories: src/repositories/RepositoryName.ts
  * Config files: package.json, tsconfig.json, serverless.yml (root level)` : `
- Use simple structure: App.tsx, ComponentName.tsx, ModelName.ts
- No complex folder hierarchies unless shown in UML
- Use simple imports: import ComponentName from './ComponentName'`}

**STRUCTURE-ONLY REQUIREMENTS:**

**For Backend Models:**
- Define EXACT TypeScript interface specifications matching class diagram properties
- Use EXACT property names and types from class diagram
- Use string types for dates (createdAt: string, updatedAt: string) for JSON compatibility
- DO NOT add properties not shown in class diagram
- Specify export structure and type definitions

**For Backend Services:**
- Define EXACT method specifications from class diagram as PUBLIC methods
- Use EXACT method signatures (parameters, return types) from class diagram
- Use EXACT method names from class diagram
- Specify business logic requirements based on model structure
- Define error handling requirements
- Method signatures must match EXACTLY what controllers will call
- Specify model interfaces for parameter and return types

**For Backend Controllers:**
- Define EXACT endpoint specifications from sequence diagram as PUBLIC methods
- Use EXACT HTTP methods and paths from sequence diagram
- Use EXACT method names from sequence diagram
- Specify request/response handling requirements
- Define input validation and sanitization requirements
- Specify appropriate HTTP status codes
- Method signatures must match EXACTLY what routes will call
- Specify model interfaces for request/response types

**For Backend Repositories:**
- Define EXACT CRUD operation specifications from class diagram as PUBLIC methods
- Use EXACT method signatures from class diagram
- Use EXACT method names from class diagram
- Specify database operation requirements
- Define error handling and logging requirements

**CRITICAL: NO CODE CONTENT**
- DO NOT generate any actual code implementations
- DO NOT include code examples or snippets
- DO NOT provide method implementations
- DO NOT include class implementations
- ONLY provide structure, specifications, and requirements
- The fileStructure should contain ONLY paths, dependencies, and descriptions
- NO content field should be populated with actual code

**RESPONSE FORMAT:**
Return ONLY a JSON object with the following structure:

{
  "backendComponents": [
    {
      "name": "ComponentName",
      "children": ["dependency1", "dependency2"],
      "description": "Component purpose"
    }
  ],
  "backendModels": [
    {
      "name": "ModelName",
      "properties": ["property1: type", "property2: type"],
      "methods": ["method1(param: type): returnType"],
      "description": "Model purpose"
    }
  ],
  "backendDependencies": [
    {
      "from": "ComponentA",
      "to": "ComponentB",
      "type": "depends_on",
      "description": "Dependency description"
    }
  ],
  "fileStructure": {
    "frontend": [],
    "backend": [
      {
        "path": "src/index.ts",
        "dependencies": ["express", "serverless-http", "./controllers/ControllerName"],
        "description": "Main Lambda entry point",
        "type": "backend"
      },
      {
        "path": "src/controllers/ControllerName.ts",
        "dependencies": ["./services/ServiceName"],
        "description": "Controller with exact method signatures",
        "type": "backend"
      },
      {
        "path": "src/services/ServiceName.ts",
        "dependencies": ["./models/ModelName", "./repositories/RepositoryName"],
        "description": "Service with exact method signatures",
        "type": "backend"
      },
      {
        "path": "src/repositories/RepositoryName.ts",
        "dependencies": ["./models/ModelName"],
        "description": "Repository with exact method signatures",
        "type": "backend"
      },
      {
        "path": "src/models/ModelName.ts",
        "dependencies": [],
        "description": "Model with exact properties",
        "type": "backend"
      },
      {
        "path": "package.json",
        "dependencies": ["express", "serverless-http"],
        "description": "Package configuration",
        "type": "backend"
      },
      {
        "path": "serverless.yml",
        "dependencies": [],
        "description": "Serverless configuration",
        "type": "backend"
      },
      {
        "path": "tsconfig.json",
        "dependencies": [],
        "description": "TypeScript configuration",
        "type": "backend"
      }
    ]
  },
  "infrastructure": {
    "lambdaFunction": {
      "name": "function-name",
      "runtime": "nodejs18.x",
      "handler": "dist/index.handler"
    },
    "apiGateway": {
      "routes": [
        {
          "path": "/api/endpoint",
          "method": "POST",
          "description": "Endpoint purpose"
        }
      ]
    }
  }
}

**CRITICAL: Ensure NO content fields contain actual code - only structure and specifications.**
**CRITICAL: Use proper src/ directory structure with organized subdirectories (controllers/, services/, repositories/, models/).**
**CRITICAL: Each file must be in its correct directory according to its type and purpose.**`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000,
      temperature: 0.1, // Lower temperature for more consistent, diagram-following output
    });

    const content = response.choices[0]?.message;
    if (content && content.content) {
      // Parse the AI response
      const cleanedResponse = cleanAIResponse(content.content);
      const result = safeJSONParse(cleanedResponse, {});
      
      // CRITICAL: Remove any content fields to ensure structure-only approach
      if (result.fileStructure) {
        result.fileStructure = removeContentFields(result.fileStructure);
      }
      
      // Ensure proper structure
      if (!result.fileStructure) {
        result.fileStructure = { frontend: [], backend: [] };
      }
      if (!result.fileStructure.frontend) {
        result.fileStructure.frontend = [];
      }
      if (!result.fileStructure.backend) {
        result.fileStructure.backend = [];
      }

      // Post-process: Ensure every file in fileStructure has a type
      if (result.fileStructure) {
        if (Array.isArray(result.fileStructure.frontend)) {
          result.fileStructure.frontend = result.fileStructure.frontend.map((f: any) => ({ ...f, type: 'frontend' }));
        }
        if (Array.isArray(result.fileStructure.backend)) {
          result.fileStructure.backend = result.fileStructure.backend.map((f: any) => ({ ...f, type: 'backend' }));
        }
      }

      // CRITICAL: Ensure index.ts is always included in backend file structure
      if (planType === 'backend') {
        result.fileStructure = ensureIndexTsInBackend(result.fileStructure);
        
        // Ensure infrastructure configuration is included for backend
        if (!result.infrastructure) {
          result.infrastructure = {
            lambdaFunction: {
              name: "notes-app",
              runtime: "nodejs18.x",
              handler: "dist/index.handler",
              environment: {
                NODE_ENV: "production"
              }
            },
            apiGateway: {
              routes: [
                {
                  path: "/notes",
                  method: "POST",
                  description: "Create a new note"
                },
                {
                  path: "/health",
                  method: "GET",
                  description: "Health check endpoint for Lambda monitoring"
                }
              ]
            },
            database: {
              type: "DynamoDB",
              tables: ["notes-data", "notes-users"]
            }
          };
        }
        
        // Ensure package.json and serverless.yml are included
        const hasPackageJson = result.fileStructure.backend.some((f: any) => f.path === 'package.json');
        const hasServerlessYml = result.fileStructure.backend.some((f: any) => f.path === 'serverless.yml');
        const hasTsConfig = result.fileStructure.backend.some((f: any) => f.path === 'tsconfig.json');
        
        if (!hasPackageJson) {
          result.fileStructure.backend.push({
            path: 'package.json',
            dependencies: ['express', 'serverless-http', 'helmet', 'cors', '@aws-sdk/client-dynamodb'],
            description: 'Package configuration with Lambda-compatible dependencies',
            type: 'backend'
          });
        }
        
        if (!hasServerlessYml) {
          result.fileStructure.backend.push({
            path: 'serverless.yml',
            dependencies: [],
            description: 'Serverless framework configuration for AWS Lambda deployment',
            type: 'backend'
          });
        }
        
        if (!hasTsConfig) {
          result.fileStructure.backend.push({
            path: 'tsconfig.json',
            dependencies: [],
            description: 'TypeScript configuration for proper compilation',
            type: 'backend'
          });
        }
        
        // CRITICAL: Update all backend file dependencies to use proper src/ structure
        result.fileStructure.backend = result.fileStructure.backend.map((file: any) => {
          if (file.dependencies && Array.isArray(file.dependencies)) {
            file.dependencies = file.dependencies.map((dep: string) => {
              // Convert relative imports to use src/ structure
              if (dep.startsWith('./') || dep.startsWith('../')) {
                // Extract the filename from the path
                const pathParts = dep.split('/');
                const fileName = pathParts[pathParts.length - 1];
                // Remove .ts extension if present
                const cleanFileName = fileName.replace(/\.ts$/, '');
                
                // Determine the proper path based on file type
                if (fileName.includes('Controller')) {
                  return `./controllers/${cleanFileName}`;
                } else if (fileName.includes('Service')) {
                  return `./services/${cleanFileName}`;
                } else if (fileName.includes('Repository')) {
                  return `./repositories/${cleanFileName}`;
                } else if (fileName.includes('Model') || fileName.includes('Interface')) {
                  return `./models/${cleanFileName}`;
                } else {
                  return `./${cleanFileName}`;
                }
              }
              return dep;
            });
          }
          return file;
        });
      }

      console.log(`[umlToCodePlan] STRICT AI analysis completed successfully for ${planType}`);
      
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
    console.error(`[umlToCodePlan] Error in STRICT AI analysis for ${planType}:`, error);
    // Throw error instead of falling back to dummy code
    throw new Error(`AI analysis failed: ${error.message}. Please ensure AI providers are properly configured and UML diagrams are valid.`);
  }
}

/**
 * Main function: parse all diagrams into a comprehensive CodePlan using AI with STRICT adherence
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
}, infrastructureContext?: any, planType: 'frontend' | 'backend' = 'frontend', enhancedPrompt?: string): Promise<CodePlan> {
  console.log(`[umlToCodePlan] Starting STRICT CodePlan generation for ${planType} with infrastructure context...`);
  console.log('[umlToCodePlan] Input diagrams:');
  console.log('[umlToCodePlan] - frontendComponentDiagram:', frontendComponentDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - backendComponentDiagram:', backendComponentDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - frontendClassDiagram:', frontendClassDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - backendClassDiagram:', backendClassDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - frontendSequenceDiagram:', frontendSequenceDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - backendSequenceDiagram:', backendSequenceDiagram ? 'present' : 'missing');
  console.log('[umlToCodePlan] - infrastructureContext:', infrastructureContext ? 'present' : 'missing');
  console.log('[umlToCodePlan] - planType:', planType);
  console.log('[umlToCodePlan] - enhancedPrompt:', enhancedPrompt ? 'present' : 'missing');
  
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
  
  const result = await analyzeUMLDiagramsWithAI(diagrams, infrastructureContext, planType, enhancedPrompt);
  console.log(`[umlToCodePlan] Final STRICT CodePlan result for ${planType}: Generated ${result.fileStructure?.frontend?.length || 0} frontend files, ${result.fileStructure?.backend?.length || 0} backend files`);
  
  // Final safety check: if result is still empty, throw error
  const hasFrontendFiles = result.fileStructure?.frontend?.length > 0;
  const hasBackendFiles = result.fileStructure?.backend?.length > 0;
  
  if (!hasFrontendFiles && !hasBackendFiles) {
    throw new Error('CodePlan generation failed: No files were generated. Please check your UML diagrams and AI configuration.');
  }
  
  return result;
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