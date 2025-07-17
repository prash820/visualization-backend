import fs from 'fs/promises';
import path from 'path';
import { CodePlan } from '../utils/umlToCodePlan';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import { flattenFileStructure } from '../utils/flattenFileStructure';
import { existsSync } from 'fs';

/**
 * Clean AI responses that contain markdown code blocks
 */
function cleanAIResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```typescript\n?/g, '').replace(/```ts\n?/g, '').replace(/```\n?/g, '').trim();
  
  // If the response starts with import or export, it's likely valid code
  if (cleaned.startsWith('import') || cleaned.startsWith('export') || cleaned.startsWith('class') || cleaned.startsWith('interface')) {
    return cleaned;
  }
  
  // Try to extract code from the response (look for TypeScript patterns)
  const codeMatch = cleaned.match(/(import[\s\S]*?export[\s\S]*?)/);
  if (codeMatch) {
    return codeMatch[0];
  }
  
  // If no clear code pattern found, return the cleaned response
  return cleaned;
}

/**
 * Analyze existing code to extract method signatures and interfaces for consistency
 */
function analyzeExistingCode(code: string): { methods: string[], interfaces: string[], imports: string[] } {
  const methods: string[] = [];
  const interfaces: string[] = [];
  const imports: string[] = [];
  
  // Extract method calls (e.g., this.service.methodName(param))
  const methodCallRegex = /this\.\w+\.(\w+)\(/g;
  let match;
  while ((match = methodCallRegex.exec(code)) !== null) {
    methods.push(match[1]);
  }
  
  // Extract interface definitions
  const interfaceRegex = /interface\s+(\w+)\s*{/g;
  while ((match = interfaceRegex.exec(code)) !== null) {
    interfaces.push(match[1]);
  }
  
  // Extract imports
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return { methods, interfaces, imports };
}

/**
 * Generate consistency context from existing files
 */
function generateConsistencyContext(existingFiles: { path: string; content: string }[]): string {
  let context = '';
  
  for (const file of existingFiles) {
    const analysis = analyzeExistingCode(file.content);
    if (analysis.methods.length > 0 || analysis.interfaces.length > 0) {
      context += `// File: ${file.path}\n`;
      if (analysis.methods.length > 0) {
        context += `// Methods called: ${analysis.methods.join(', ')}\n`;
      }
      if (analysis.interfaces.length > 0) {
        context += `// Interfaces defined: ${analysis.interfaces.join(', ')}\n`;
      }
      if (analysis.imports.length > 0) {
        context += `// Imports: ${analysis.imports.join(', ')}\n`;
      }
      context += '\n';
    }
  }
  
  return context;
}

/**
 * Generate complete backend folder structure and files using enhanced CodePlan
 */
async function generateCompleteBackendStructure(codePlan: CodePlan, projectPath: string) {
  // If we have a complete file structure from the CodePlan, use it directly
  if (codePlan.fileStructure.backend.length > 0) {
    console.log('[BackendComponentAgent] Using pre-generated file structure from CodePlan');
    for (const file of codePlan.fileStructure.backend) {
      const filePath = path.join(projectPath, 'backend', file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // If content is empty, generate code using the backend agent
      if (!file.content || file.content.trim() === '') {
        console.log(`[BackendComponentAgent] Generating code for ${file.path} using AI...`);
        const generatedCode = await generateBackendFile(file, codePlan, projectPath);
        await fs.writeFile(filePath, generatedCode);
      } else {
        // Use the provided content (if any)
        await fs.writeFile(filePath, file.content);
      }
    }
    return codePlan.fileStructure.backend;
  }

  // If we have projectStructure format, convert it to file structure
  if (codePlan.projectStructure) {
    console.log('[BackendComponentAgent] Converting projectStructure to file structure...');
    const files: Array<{ path: string; content: string; dependencies: string[]; description?: string }> = [];
    
    // Convert projectStructure to file structure
    if (codePlan.projectStructure.src) {
      const src = codePlan.projectStructure.src;
      
      // Convert controllers
      if (src.controllers) {
        Object.entries(src.controllers).forEach(([name, description]) => {
          files.push({
            path: `src/controllers/${name}.ts`,
            content: `// ${description}\n// TODO: Implement ${name} controller`,
            dependencies: [],
            description
          });
        });
      }
      
      // Convert services
      if (src.services) {
        Object.entries(src.services).forEach(([name, description]) => {
          files.push({
            path: `src/services/${name}.ts`,
            content: `// ${description}\n// TODO: Implement ${name} service`,
            dependencies: [],
            description
          });
        });
      }
      
      // Convert models
      if (src.models) {
        Object.entries(src.models).forEach(([name, description]) => {
          files.push({
            path: `src/models/${name}.ts`,
            content: `// ${description}\n// TODO: Implement ${name} model`,
            dependencies: [],
            description
          });
        });
      }
      
      // Convert API files
      if (src.api) {
        Object.entries(src.api).forEach(([name, description]) => {
          files.push({
            path: `src/api/${name}.ts`,
            content: `// ${description}\n// TODO: Implement ${name} API`,
            dependencies: [],
            description
          });
        });
      }
      
      // Convert config files
      if (src.config) {
        Object.entries(src.config).forEach(([name, description]) => {
          files.push({
            path: `src/config/${name}.ts`,
            content: `// ${description}\n// TODO: Implement ${name} config`,
            dependencies: [],
            description
          });
        });
      }
      
      // Convert utils
      if (src.utils) {
        Object.entries(src.utils).forEach(([name, description]) => {
          files.push({
            path: `src/utils/${name}.ts`,
            content: `// ${description}\n// TODO: Implement ${name} utility`,
            dependencies: [],
            description
          });
        });
      }
    }
    
    // Convert test files
    if (codePlan.projectStructure.test) {
      const test = codePlan.projectStructure.test;
      
      if (test.controllers) {
        Object.entries(test.controllers).forEach(([name, description]) => {
          files.push({
            path: `test/controllers/${name}.test.ts`,
            content: `// ${description}\n// TODO: Implement ${name} controller tests`,
            dependencies: [],
            description
          });
        });
      }
      
      if (test.services) {
        Object.entries(test.services).forEach(([name, description]) => {
          files.push({
            path: `test/services/${name}.test.ts`,
            content: `// ${description}\n// TODO: Implement ${name} service tests`,
            dependencies: [],
            description
          });
        });
      }
    }
    
    // Write the converted files
    for (const file of files) {
      const filePath = path.join(projectPath, 'backend', file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
    
    console.log(`[BackendComponentAgent] Converted and wrote ${files.length} files from projectStructure`);
    return files;
  }

  // Fallback: Generate files using AI based on services, models, dependencies, and integration
  console.log('[BackendComponentAgent] Generating backend structure using AI...');
  
  const prompt = `Generate a complete Node.js TypeScript backend application structure for AWS Lambda hosting based on the following comprehensive analysis:

**SERVICES:**
${JSON.stringify(codePlan.backendComponents, null, 2)}

**MODELS:**
${JSON.stringify(codePlan.backendModels, null, 2)}

**DEPENDENCIES:**
${JSON.stringify(codePlan.backendDependencies, null, 2)}

**INTEGRATION WITH FRONTEND:**
${JSON.stringify(codePlan.integration, null, 2)}

**CRITICAL REQUIREMENTS:**
- Generate ONLY functional, production-ready code for AWS Lambda hosting
- NO explanations, comments, or markdown formatting in the content
- NO commented-out code or placeholder content
- NO "TODO" or "FIXME" comments
- Include proper TypeScript interfaces and types based on models
- Use Express.js with serverless-http wrapper for Lambda
- Include proper imports and dependencies based on dependency analysis
- Add error handling and validation
- Include authentication and authorization
- Add database integration patterns for serverless
- Include API documentation
- Add logging and monitoring for Lambda
- Create API endpoints that match frontend integration requirements
- Include proper CORS configuration for Lambda
- Add rate limiting and security measures
- NO server startup logic (app.listen) - use Lambda handler instead

**LAMBDA-SPECIFIC REQUIREMENTS:**
- Main entry point must export a Lambda handler function
- Use serverless-http to wrap Express app
- Handle APIGatewayProxyEvent and return APIGatewayProxyResult
- Include proper CORS headers for API Gateway
- Use environment variables for configuration
- Implement cold start optimization patterns
- Add proper error handling for Lambda context
- Include Lambda-specific logging and monitoring

**FOLDER STRUCTURE:**
- src/controllers/ - API controllers (based on integration endpoints)
- src/services/ - Business logic services (based on component analysis)
- src/models/ - Data models (based on class diagrams)
- src/routes/ - API routes (based on integration endpoints)
- src/middleware/ - Express middleware
- src/utils/ - Utility functions
- src/types/ - TypeScript interfaces (based on models)
- src/config/ - Configuration files
- src/lambda/ - Lambda-specific handlers and utilities

**INTEGRATION REQUIREMENTS:**
- Create API endpoints that match the integration specification
- Use proper HTTP methods and status codes
- Include request/response validation
- Add proper error handling and logging
- Implement authentication middleware where needed
- Include CORS configuration for frontend integration
- Add proper TypeScript interfaces for API contracts
- Ensure all endpoints work with API Gateway

**RESPONSE FORMAT:**
Return a JSON array of file objects with COMPLETE, FUNCTIONAL code:

[
  {
    "path": "src/index.ts",
    "content": "import express from 'express';\nimport serverless from 'serverless-http';\nimport cors from 'cors';\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\n// Routes here\n\nexport const handler = serverless(app);\nexport default app;",
    "dependencies": ["express", "serverless-http", "cors"],
    "description": "Lambda entry point with Express app"
  }
]

**CRITICAL:**
- The "content" field must contain ONLY valid TypeScript/Node.js code
- NO markdown formatting in content
- NO code fences (\`\`\`) in content
- NO explanatory text in content
- NO placeholder comments like "// Complete TypeScript service code"
- Generate immediately functional code that compiles and works in Lambda
- Start each file with proper imports and end with proper exports
- Main entry point MUST export a Lambda handler function

Generate ALL necessary files for a complete Lambda-hosted backend application. Include:
- Lambda handler entry point with serverless-http
- API routes for all endpoints specified in integration
- Controllers for handling HTTP requests
- Services for business logic
- Models for data structures
- Middleware for authentication, validation, and error handling
- Utility functions for common operations
- TypeScript interfaces for all models and API contracts
- Configuration files for environment variables
- Error handling and logging setup for Lambda
- Database connection and models optimized for serverless
- Authentication and authorization system
- Lambda-specific deployment and configuration files

Return only the JSON array, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.7,
    });
    const content = response.choices[0]?.message;
    if (content && content.content) {
      let cleanedResponse = cleanAIResponse(content.content);
      let files;
      try {
        files = JSON.parse(cleanedResponse);
      } catch (parseErr) {
        console.error('[BackendComponentAgent] First JSON.parse failed. Raw output:', cleanedResponse);
        // Retry with a clarification prompt
        const retryPrompt = `Your last response was not valid JSON. Please return only valid JSON for the backend file structure, no explanations.`;
        const retryResponse = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'user', content: retryPrompt },
            { role: 'user', content: cleanedResponse }
          ],
          max_tokens: 6000,
          temperature: 0.7,
        });
        const retryContent = retryResponse.choices[0]?.message;
        if (retryContent && retryContent.content) {
          try {
            files = JSON.parse(cleanAIResponse(retryContent.content));
          } catch (retryParseErr) {
            console.error('[BackendComponentAgent] Second JSON.parse failed. Raw output:', retryContent.content);
            throw new Error('AI returned invalid JSON twice. Raw output: ' + retryContent.content);
          }
        } else {
          throw new Error('Unexpected response type from AI on retry');
        }
      }
      // Flatten the file structure in case it's a nested object
      const flatFiles = flattenFileStructure(files);
      for (const file of flatFiles) {
        const filePath = path.join(projectPath, 'backend', file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }
      
      return flatFiles;
    } else {
      throw new Error('Unexpected response type from AI');
    }
  } catch (error) {
    console.error('[BackendComponentAgent] Error generating backend structure:', error);
    throw error;
  }
}

/**
 * Check if the generated content is just comments or placeholders
 */
function isCommentOrPlaceholder(content: string): boolean {
  const trimmed = content.trim();
  
  // Check if it's just a single comment line
  if (trimmed.startsWith('//') && !trimmed.includes('\n')) {
    return true;
  }
  
  // Check if it's just multiple comment lines
  const lines = trimmed.split('\n');
  const nonCommentLines = lines.filter(line => {
    const trimmedLine = line.trim();
    return trimmedLine.length > 0 && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && !trimmedLine.startsWith('*');
  });
  
  // If there are no non-comment lines, it's just comments
  if (nonCommentLines.length === 0) {
    return true;
  }
  
  // Check for placeholder patterns
  const placeholderPatterns = [
    /TODO:/i,
    /FIXME:/i,
    /placeholder/i,
    /complete.*typescript.*code/i,
    /implement.*here/i,
    /add.*code.*here/i
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Generate code for a single backend file/component using the backend plan as context
 */
export async function generateBackendFile(file: { path: string, content?: string, dependencies?: string[], description?: string }, backendPlan: any, projectPath?: string): Promise<string> {
  const maxRetries = 3;

  // Gather dependency code context
  let dependencyCodeContext = '';
  if (file.dependencies && file.dependencies.length > 0 && projectPath) {
    for (const dep of file.dependencies) {
      // Try to resolve dependency path relative to backend/src
      let depPath = dep;
      if (!depPath.endsWith('.ts')) depPath += '.ts';
      const absDepPath = path.join(projectPath, 'backend', depPath);
      if (existsSync(absDepPath)) {
        try {
          const code = await fs.readFile(absDepPath, 'utf-8');
          dependencyCodeContext += `// File: ${depPath}\n` + code + '\n\n';
        } catch (e) {
          dependencyCodeContext += `// File: ${depPath}\n// (Could not read file)\n`;
        }
      } else {
        // Try to find in backendPlan.fileStructure.backend
        let planned = '';
        if (backendPlan && backendPlan.fileStructure && backendPlan.fileStructure.backend) {
          const plannedFile = backendPlan.fileStructure.backend.find((f: any) => f.path === depPath);
          if (plannedFile && plannedFile.content) {
            planned = plannedFile.content;
          }
        }
        dependencyCodeContext += `// File: ${depPath}\n${planned ? planned : '// (No code available, planned dependency)'}\n\n`;
      }
    }
  }

  // Also gather context from files that depend on this file (reverse dependencies)
  if (projectPath && backendPlan && backendPlan.fileStructure && backendPlan.fileStructure.backend) {
    const reverseDeps: string[] = [];
    const existingFiles: { path: string; content: string }[] = [];
    
    for (const otherFile of backendPlan.fileStructure.backend) {
      if (otherFile.dependencies && otherFile.dependencies.some((dep: string) => {
        const depPath = dep.endsWith('.ts') ? dep : dep + '.ts';
        return depPath === file.path;
      })) {
        reverseDeps.push(otherFile.path);
        
        // Read the existing file content for analysis
        const absReverseDepPath = path.join(projectPath, 'backend', otherFile.path);
        if (existsSync(absReverseDepPath)) {
          try {
            const code = await fs.readFile(absReverseDepPath, 'utf-8');
            existingFiles.push({ path: otherFile.path, content: code });
          } catch (e) {
            // File exists but couldn't be read
          }
        }
      }
    }
    
    if (reverseDeps.length > 0) {
      dependencyCodeContext += `// Files that depend on this file: ${reverseDeps.join(', ')}\n`;
      
      // Add consistency context
      const consistencyContext = generateConsistencyContext(existingFiles);
      if (consistencyContext) {
        dependencyCodeContext += `// CONSISTENCY REQUIREMENTS (from existing files):\n${consistencyContext}`;
      }
      
      for (const reverseDep of reverseDeps) {
        const absReverseDepPath = path.join(projectPath, 'backend', reverseDep);
        if (existsSync(absReverseDepPath)) {
          try {
            const code = await fs.readFile(absReverseDepPath, 'utf-8');
            dependencyCodeContext += `// Dependent file: ${reverseDep}\n` + code + '\n\n';
          } catch (e) {
            dependencyCodeContext += `// Dependent file: ${reverseDep}\n// (Could not read file)\n`;
          }
        }
      }
    }
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[BackendComponentAgent] Generating ${file.path} (attempt ${attempt}/${maxRetries})`);
    
    const prompt = `You are an expert backend developer. Generate the complete, functional TypeScript code for the following backend file as part of a Node.js/Express application hosted on AWS Lambda. Use the provided backend plan for context.

**FILE TO GENERATE:**
Path: ${file.path}
Description: ${file.description || ''}
Dependencies: ${(file.dependencies || []).join(', ')}

**DEPENDENCY CODE CONTEXT:**
${dependencyCodeContext}

**BACKEND PLAN CONTEXT:**
${JSON.stringify(backendPlan, null, 2)}

**CRITICAL REQUIREMENTS:**
- Generate ONLY functional, production-ready code
- NO explanations, comments, or markdown formatting
- NO placeholder or commented-out code
- NO "TODO" or "FIXME" comments
- NO placeholder text like "Complete TypeScript code here"
- Use proper imports for all dependencies
- Use TypeScript with proper typing
- Follow best practices for Node.js/Express on Lambda
- Include error handling and validation
- Start with the first import and end with the last export
- Generate immediately functional code that compiles and works

**IMPORT/EXPORT CONSISTENCY RULES:**
- If a file exports a class, use "export class ClassName" and import with "import { ClassName } from 'path'"
- If a file exports a default instance, use "export default new ClassName()" and import with "import ClassName from 'path'"
- If a file exports functions, use "export function functionName" and import with "import { functionName } from 'path'"
- If a file exports a default function, use "export default functionName" and import with "import functionName from 'path'"
- Middleware files should export default functions: "export default function middlewareName"
- Service files should export classes: "export class ServiceName" or "export default new ServiceName()"
- Controller files should export classes: "export class ControllerName"
- Route files should export default routers: "export default router"
- Utility files should export named functions: "export function utilityName"

**METHOD SIGNATURE CONSISTENCY:**
- If a service method is called "performCalculation(expression: string)" in a controller, the service MUST have that exact method signature
- If a service method is called "validateToken(token: string)" in a route, the service MUST have that exact method signature
- Method names must match exactly between caller and callee
- Parameter types must match exactly between caller and callee
- Return types must be consistent across related files

**ERROR HANDLING PATTERNS:**
- Use "catch (error: any)" for all catch blocks to avoid TypeScript errors
- Always check if error has a message property before accessing it
- Use proper error types and interfaces
- Include proper error responses in API endpoints

**LAMBDA-SPECIFIC REQUIREMENTS:**
- Use serverless-http for Lambda integration
- Export handler function for Lambda entry point
- Use proper AWS SDK imports (aws-sdk v2 for compatibility)
- Include proper environment variable handling
- Use async/await patterns throughout

**CONSISTENCY REQUIREMENTS:**
- If this is a service file, ensure method names match what controllers expect to call
- If this is a controller file, ensure method calls match the actual service method signatures
- If this is a model file, ensure it has proper constructors and methods that services expect
- Maintain consistent interface names and parameter structures across related files
- Use the same method names and parameter types that are referenced in dependent files
- If a service method is called "performCalculation" in a controller, the service must have that exact method name
- If a service expects a specific interface, ensure the controller provides it correctly

**FILE TYPE SPECIFIC REQUIREMENTS:**
${getFileTypeSpecificRequirements(file.path)}

**CRITICAL: Return ONLY the code, no explanations, no markdown, no code fences, no placeholder comments. The response must be immediately functional TypeScript/Node.js code.`;

    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message;
      if (content && content.content) {
        const generatedCode = cleanAIResponse(content.content.trim());
        
        // Check if the generated content is just comments or placeholders
        if (isCommentOrPlaceholder(generatedCode)) {
          console.warn(`[BackendComponentAgent] Attempt ${attempt}: AI returned only comments/placeholders for ${file.path}`);
          console.warn(`[BackendComponentAgent] Generated content: ${generatedCode.substring(0, 200)}...`);
          
          if (attempt === maxRetries) {
            console.error(`[BackendComponentAgent] All ${maxRetries} attempts failed for ${file.path}, generating fallback code`);
            return generateFallbackCode(file);
          }
          
          // Continue to next attempt
          continue;
        }
        
        console.log(`[BackendComponentAgent] Successfully generated code for ${file.path} on attempt ${attempt}`);
        return generatedCode;
      } else {
        throw new Error('No content returned from OpenAI');
      }
    } catch (error) {
      console.error(`[BackendComponentAgent] Attempt ${attempt} failed for ${file.path}:`, error);
      
      if (attempt === maxRetries) {
        console.error(`[BackendComponentAgent] All ${maxRetries} attempts failed for ${file.path}, generating fallback code`);
        return generateFallbackCode(file);
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // This should never be reached, but just in case
  return generateFallbackCode(file);
}

/**
 * Get file type specific requirements for the prompt
 */
function getFileTypeSpecificRequirements(filePath: string): string {
  if (filePath.includes('routes/') || filePath.endsWith('Routes.ts')) {
    return `- This is an Express.js route file for Lambda hosting
- Create proper route handlers with HTTP methods (GET, POST, PUT, DELETE)
- Include request/response validation
- Add proper error handling with "catch (error: any)"
- Export the router as default: "export default router"
- Include TypeScript interfaces for request/response types
- Ensure routes work with API Gateway and Lambda
- IMPORTANT: Service method calls must match exact method names and signatures
- If calling "CalculatorService.performCalculation(expression)", ensure CalculatorService has that exact method
- Use proper import statements: "import ServiceName from '../services/ServiceName'"
- Handle async operations with proper error handling`;
  } else if (filePath.includes('controllers/') || filePath.endsWith('Controller.ts')) {
    return `- This is an Express.js controller file for Lambda hosting
- Create controller methods that handle HTTP requests
- Include proper request/response handling
- Add error handling and validation with "catch (error: any)"
- Use async/await patterns
- Export the controller class: "export class ControllerName"
- Ensure controllers work with Lambda context
- IMPORTANT: Method calls to services must match the exact method names and signatures in the service files
- If calling a service method like "performCalculation(expression: string)", ensure the service has that exact method signature
- Pass parameters in the format expected by the service methods
- Use proper import statements: "import { ServiceName } from '../services/ServiceName'"
- Include NextFunction parameter in method signatures`;
  } else if (filePath.includes('services/') || filePath.endsWith('Service.ts')) {
    return `- This is a business logic service file for Lambda hosting
- Create service methods for business operations
- Include proper error handling with "catch (error: any)"
- Use dependency injection patterns
- Add logging where appropriate
- Export the service class: "export class ServiceName" or "export default new ServiceName()"
- Optimize for Lambda cold starts
- IMPORTANT: Method names must match what controllers expect to call
- If a controller calls "performCalculation(expression: string)", this service must have that exact method signature
- Ensure method signatures match the parameter types that controllers will pass
- Use proper TypeScript interfaces for request/response types
- Include proper return types for all methods
- Use proper import statements for dependencies`;
  } else if (filePath.includes('models/') || filePath.endsWith('Model.ts')) {
    return `- This is a data model file for Lambda hosting
- Create TypeScript interfaces and classes
- Include proper type definitions
- Add validation methods if needed
- Export the model interfaces and classes: "export class ModelName" or "export interface ModelName"
- Consider serverless database patterns
- Include proper error handling with "catch (error: any)"
- Use AWS SDK v2 for DynamoDB: "import { DynamoDB } from 'aws-sdk'"
- Include proper constructor and method signatures
- Export both the class and any interfaces used`;
  } else if (filePath.includes('middleware/') || filePath.endsWith('Middleware.ts')) {
    return `- This is an Express.js middleware file for Lambda hosting
- Create middleware functions that handle requests
- Include proper error handling with "catch (error: any)"
- Use the next() function correctly
- Export the middleware as default: "export default function middlewareName"
- Ensure middleware works with Lambda context
- Include proper TypeScript types for Request, Response, NextFunction
- Handle async operations properly
- Use proper import statements for dependencies`;
  } else if (filePath.includes('utils/') || filePath.endsWith('Utils.ts')) {
    return `- This is a utility file for Lambda hosting
- Create helper functions and utilities
- Include proper TypeScript types
- Add error handling where needed with "catch (error: any)"
- Export the utility functions: "export function functionName"
- Optimize for Lambda execution environment
- Use proper import statements for dependencies
- Include validation functions if needed
- Export both main functions and validation helpers`;
  } else if (filePath.includes('config/') || filePath.endsWith('Config.ts')) {
    return `- This is a configuration file for Lambda hosting
- Create configuration objects and functions
- Include environment variable handling
- Add proper TypeScript types
- Export the configuration: "export const config" or "export default config"
- Use Lambda environment variables: "process.env.VARIABLE_NAME"
- Include proper error handling for missing environment variables
- Use proper import statements for dependencies`;
  } else if (filePath.endsWith('server.ts') || filePath.endsWith('app.ts') || filePath.endsWith('index.ts')) {
    return `- This is the main Lambda entry point file
- Create Express.js app setup with serverless-http
- Include middleware configuration
- Add route registration
- Export Lambda handler function: "export const handler = serverless(app)"
- Add proper error handling for Lambda context
- NO app.listen() - use serverless-http handler instead
- Use proper import statements: "import serverless from 'serverless-http'"
- Include CORS, helmet, and other security middleware
- Handle environment variables properly`;
  } else if (filePath.includes('lambda/') || filePath.endsWith('Lambda.ts')) {
    return `- This is a Lambda-specific handler file
- Create Lambda handler functions
- Handle APIGatewayProxyEvent and return APIGatewayProxyResult
- Include proper CORS headers
- Add error handling for Lambda context with "catch (error: any)"
- Export the handler function: "export const handler"
- Include Lambda-specific logging
- Use proper import statements: "import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'"
- Handle different HTTP methods properly
- Include proper error responses`;
  }
  
  return `- Generate appropriate TypeScript/Node.js code for Lambda hosting
- Include proper imports and exports
- Add error handling and validation with "catch (error: any)"
- Follow TypeScript best practices
- Optimize for serverless execution
- Use proper import/export patterns
- Include proper type definitions`;
}

/**
 * Generate fallback code when AI fails
 */
function generateFallbackCode(file: { path: string, content?: string, dependencies?: string[], description?: string }): string {
  console.log(`[BackendComponentAgent] Generating fallback code for ${file.path}`);
  
  if (file.path.includes('routes/') || file.path.endsWith('Routes.ts')) {
    return `import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

// GET endpoint
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'Route working', timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = req.body;
    res.json({ message: 'Data received', data, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;`;
  } else if (file.path.includes('controllers/') || file.path.endsWith('Controller.ts')) {
    const className = file.path.split('/').pop()?.replace('.ts', '') || 'Controller';
    return `import { Request, Response, NextFunction } from 'express';

export class ${className} {
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ message: 'Controller working', timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data } = req.body;
      res.json({ message: 'Data created', data, timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}`;
  } else if (file.path.includes('services/') || file.path.endsWith('Service.ts')) {
    const className = file.path.split('/').pop()?.replace('.ts', '') || 'Service';
    return `export class ${className} {
  async processData(data: any): Promise<any> {
    try {
      return { processed: true, data, timestamp: new Date().toISOString() };
    } catch (error: any) {
      throw new Error('Service processing failed');
    }
  }

  async validateInput(input: any): Promise<boolean> {
    return input && typeof input === 'object';
  }
}`;
  } else if (file.path.includes('middleware/') || file.path.endsWith('Middleware.ts')) {
    const functionName = file.path.split('/').pop()?.replace('.ts', '').replace(/[^a-zA-Z0-9]/g, '') || 'middleware';
    return `import { Request, Response, NextFunction } from 'express';

export default function ${functionName}(req: Request, res: Response, next: NextFunction): void {
  try {
    // Middleware logic here
    console.log('Middleware executed:', req.method, req.path);
    next();
  } catch (error: any) {
    console.error('Middleware error:', error);
    res.status(500).json({ error: 'Middleware error' });
  }
}`;
  } else if (file.path.includes('utils/') || file.path.endsWith('Utils.ts')) {
    const functionName = file.path.split('/').pop()?.replace('.ts', '').replace(/[^a-zA-Z0-9]/g, '') || 'utility';
    return `export function ${functionName}(input: any): any {
  try {
    return { processed: true, input, timestamp: new Date().toISOString() };
  } catch (error: any) {
    throw new Error('Utility function failed');
  }
}

export function validate${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(input: any): boolean {
  return input !== null && input !== undefined;
}`;
  } else if (file.path.includes('models/') || file.path.endsWith('Model.ts')) {
    const className = file.path.split('/').pop()?.replace('.ts', '') || 'Model';
    return `export class ${className} {
  private data: any;

  constructor() {
    this.data = {};
  }

  async save(item: any): Promise<void> {
    try {
      this.data = { ...this.data, ...item };
    } catch (error: any) {
      throw new Error('Model save failed');
    }
  }

  async find(id: string): Promise<any> {
    try {
      return this.data[id] || null;
    } catch (error: any) {
      throw new Error('Model find failed');
    }
  }
}`;
  } else if (file.path.endsWith('server.ts') || file.path.endsWith('app.ts') || file.path.endsWith('index.ts')) {
    return generateServerEntryPoint();
  } else if (file.path.includes('lambda/') || file.path.endsWith('Lambda.ts')) {
    return `import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, path, body } = event;
    
    console.log(\`Lambda handler called: \${httpMethod} \${path}\`);
    
    // Process the request based on method and path
    switch (httpMethod) {
      case 'GET':
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Lambda function working',
            method: httpMethod,
            path,
            timestamp: new Date().toISOString()
          })
        };
        
      case 'POST':
        const parsedBody = body ? JSON.parse(body) : {};
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            message: 'Data processed by Lambda',
            data: parsedBody,
            timestamp: new Date().toISOString()
          })
        };
        
      default:
        return {
          statusCode: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Method not allowed',
            method: httpMethod
          })
        };
    }
  } catch (error: any) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};`;
  } else {
    const exportName = file.path.split('/').pop()?.replace('.ts', '').replace(/[^a-zA-Z0-9]/g, '') || 'fallback';
    return `// Fallback code for ${file.path}
export const ${exportName} = {
  init: () => {
    console.log('Fallback module initialized');
  },
  process: (data: any) => {
    try {
      return { processed: true, data, timestamp: new Date().toISOString() };
    } catch (error: any) {
      throw new Error('Fallback processing failed');
    }
  }
};`;
  }
}

/**
 * Generate a complete server entry point file content for Lambda hosting
 */
function generateServerEntryPoint(): string {
  return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import serverless from 'serverless-http';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration for Lambda
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Logging middleware (conditional for Lambda)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'lambda-backend'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Lambda Backend API is running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes (to be added)
app.use('/api', (req, res) => {
  res.json({ message: 'API endpoint placeholder' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Export the serverless handler for AWS Lambda
export const handler = serverless(app);

// For local development, export the app
export default app;`;
}

export async function generateBackendComponents(
  codePlan: CodePlan,
  projectPath: string
) {
  console.log('[BackendComponentAgent] Starting enhanced backend generation...');
  console.log('[BackendComponentAgent] CodePlan received:', JSON.stringify(codePlan, null, 2));
  
  // Check for both CodePlan interface structure and actual backend plan structure
  const hasBackendComponents = codePlan.backendComponents && codePlan.backendComponents.length > 0;
  const hasFileStructure = codePlan.fileStructure && codePlan.fileStructure.backend && codePlan.fileStructure.backend.length > 0;
  
  if (!hasBackendComponents && !hasFileStructure) {
    console.log('[BackendComponentAgent] No backend components in CodePlan, generating basic structure...');
    // Generate basic structure even if no components
    const basicCodePlan: CodePlan = {
      ...codePlan,
      backendComponents: [{ name: 'BasicAPI', children: ['Server', 'Router', 'Controller'] }],
      backendModels: [],
      frontendComponents: [],
      frontendModels: [],
      frontendDependencies: [],
      backendDependencies: [],
      fileStructure: { frontend: [], backend: [] }
    };
    await generateCompleteBackendStructure(basicCodePlan, projectPath);
    return;
  }
  
  await generateCompleteBackendStructure(codePlan, projectPath);
  console.log('[BackendComponentAgent] Enhanced backend generation completed');
} 