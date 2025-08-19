// src/utils/aiDrivenArchitectureGenerator.ts
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import fs from 'fs/promises';
import path from 'path';
import { ComponentPlan } from './componentPlanGenerator';
import { FunctionSignatureContract } from './functionSignatureGenerator';
import { InfrastructureContext } from '../types/infrastructure';

/**
 * AI-Driven Architecture Enhancement
 * Enhances existing infrastructure and UML-based generation with AI suggestions
 */
export interface AIArchitectureEnhancement {
  suggestedPattern: string;
  improvements: {
    componentPlan: {
      suggestions: string[];
      enhancements: Array<{
        component: string;
        type: 'entity' | 'service' | 'controller' | 'repository';
        suggestion: string;
        reason: string;
      }>;
    };
    contracts: {
      suggestions: string[];
      enhancements: Array<{
        component: string;
        type: 'method' | 'property' | 'dependency';
        suggestion: string;
        reason: string;
      }>;
    };
    fileStructure: {
      suggestions: string[];
      recommendedStructure: Array<{
        path: string;
        purpose: string;
        reason: string;
      }>;
    };
  };
  generationOptimizations: {
    order: Array<{
      component: string;
      reason: string;
      dependencies: string[];
    }>;
    patterns: Array<{
      name: string;
      description: string;
      implementation: string;
    }>;
  };
}

/**
 * Enhance existing component plan with AI suggestions
 */
export async function enhanceComponentPlanWithAI(
  componentPlan: ComponentPlan,
  infrastructureContext: InfrastructureContext,
  umlDiagrams: any,
  semanticContext?: string
): Promise<AIArchitectureEnhancement> {
  const prompt = `You are an expert software architect. Analyze the existing component plan, infrastructure context, and UML diagrams to suggest improvements and optimizations.

**EXISTING COMPONENT PLAN:**
${JSON.stringify(componentPlan, null, 2)}

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(infrastructureContext, null, 2)}

**UML DIAGRAMS:**
- Class Diagram: ${umlDiagrams.backendClass || 'Not provided'}
- Sequence Diagram: ${umlDiagrams.backendSequence || 'Not provided'}
- Component Diagram: ${umlDiagrams.backendComponent || 'Not provided'}

**SEMANTIC CONTEXT (existing codebase patterns):**
${semanticContext || 'No existing patterns'}

**TASK:**
Analyze the existing architecture and suggest improvements:
1. **Architecture Pattern**: Suggest the most appropriate pattern for this specific setup
2. **Component Enhancements**: Suggest improvements to entities, services, controllers, repositories
3. **Contract Improvements**: Suggest better method signatures, properties, dependencies
4. **File Structure**: Suggest better organization based on the infrastructure
5. **Generation Optimizations**: Suggest better generation order and patterns

**REQUIREMENTS:**
- Work WITH the existing infrastructure, don't replace it
- Enhance the existing UML-based components
- Consider the specific infrastructure context (AWS, database, etc.)
- Suggest practical improvements that can be implemented
- Maintain compatibility with existing patterns

**RESPONSE FORMAT:**
Return a JSON object with the following structure:
{
  "suggestedPattern": "pattern name",
  "improvements": {
    "componentPlan": {
      "suggestions": ["suggestion 1", "suggestion 2"],
      "enhancements": [
        {
          "component": "User",
          "type": "entity",
          "suggestion": "Add audit fields (createdAt, updatedAt, createdBy)",
          "reason": "Better tracking and compliance"
        }
      ]
    },
    "contracts": {
      "suggestions": ["suggestion 1", "suggestion 2"],
      "enhancements": [
        {
          "component": "UserService",
          "type": "method",
          "suggestion": "Add softDelete method for data retention",
          "reason": "Compliance and audit requirements"
        }
      ]
    },
    "fileStructure": {
      "suggestions": ["suggestion 1", "suggestion 2"],
      "recommendedStructure": [
        {
          "path": "src/shared/types",
          "purpose": "Shared TypeScript types",
          "reason": "Better type organization"
        }
      ]
    }
  },
  "generationOptimizations": {
    "order": [
      {
        "component": "BaseEntity",
        "reason": "Foundation for all entities",
        "dependencies": []
      }
    ],
    "patterns": [
      {
        "name": "Repository Pattern with Caching",
        "description": "Add Redis caching to repositories",
        "implementation": "Use infrastructure context redisEndpoint"
      }
    ]
  }
}

Generate the architecture enhancement suggestions:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.3
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  
  try {
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                     rawResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr) as AIArchitectureEnhancement;
    }
    
    throw new Error('No valid JSON found in response');
  } catch (error: any) {
    console.error('[AIArchitectureGenerator] Failed to parse enhancement suggestions:', error);
    console.error('[AIArchitectureGenerator] Raw response:', rawResponse);
    
    // Return minimal enhancement
    return {
      suggestedPattern: "Enhanced Layered Architecture",
      improvements: {
        componentPlan: {
          suggestions: ["Consider adding audit fields to entities", "Add error handling to services"],
          enhancements: []
        },
        contracts: {
          suggestions: ["Add validation to method signatures", "Consider caching patterns"],
          enhancements: []
        },
        fileStructure: {
          suggestions: ["Organize by feature rather than type", "Add shared utilities"],
          recommendedStructure: []
        }
      },
      generationOptimizations: {
        order: [],
        patterns: []
      }
    };
  }
}

/**
 * Enhance existing function signature contracts with AI suggestions
 */
export async function enhanceContractsWithAI(
  contracts: FunctionSignatureContract,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext
): Promise<FunctionSignatureContract> {
  const prompt = `You are an expert TypeScript developer. Enhance the existing function signature contracts based on AI suggestions.

**EXISTING CONTRACTS:**
${JSON.stringify(contracts, null, 2)}

**AI ENHANCEMENT SUGGESTIONS:**
${JSON.stringify(enhancement, null, 2)}

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(infrastructureContext, null, 2)}

**TASK:**
Enhance the existing contracts by:
1. **Adding suggested methods** to services and repositories
2. **Improving method signatures** with better types and validation
3. **Adding infrastructure-specific patterns** (caching, error handling, etc.)
4. **Enhancing entities** with audit fields and validation
5. **Improving dependencies** and imports

**REQUIREMENTS:**
- Keep existing structure, enhance it
- Add infrastructure-specific patterns (Redis caching, AWS SDK, etc.)
- Improve type safety and validation
- Add error handling patterns
- Consider the suggested architecture pattern

**RESPONSE FORMAT:**
Return the enhanced contracts as JSON. Keep the same structure but add improvements.

Generate the enhanced contracts:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.2
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  
  try {
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                     rawResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr) as FunctionSignatureContract;
    }
    
    throw new Error('No valid JSON found in response');
  } catch (error: any) {
    console.error('[AIArchitectureGenerator] Failed to parse enhanced contracts:', error);
    console.error('[AIArchitectureGenerator] Raw response:', rawResponse);
    
    // Return original contracts if enhancement fails
    return contracts;
  }
}

/**
 * Generate AI-enhanced code with existing infrastructure context
 */
export async function generateEnhancedCode(
  contracts: FunctionSignatureContract,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext,
  projectPath: string,
  jobId: string
): Promise<any> {
  console.log('[AIArchitectureGenerator] Generating AI-enhanced code following contracts exactly...');
  
  const results = [];
  
  // === PHASE 1: Generate Interfaces First (dependencies for other components) ===
  console.log('[AIArchitectureGenerator] Phase 1: Generating interfaces...');
  
  // Generate repository interfaces
  for (const [repositoryName, contract] of Object.entries(contracts.repositories)) {
    try {
      const interfaceCode = await generateInterfaceCode(
        repositoryName,
        'repository',
        contract,
        enhancement,
        infrastructureContext
      );
      
      const filePath = path.join(projectPath, 'backend', 'src', 'repositories', `I${repositoryName}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, interfaceCode, 'utf-8');
      
      results.push({
        component: `I${repositoryName}`,
        type: 'interface',
        file: `backend/src/repositories/I${repositoryName}.ts`,
        status: 'success',
        content: interfaceCode
      });
      
      console.log(`[AIArchitectureGenerator] ✅ Generated interface: I${repositoryName}`);
      
    } catch (error: any) {
      console.error(`[AIArchitectureGenerator] ❌ Failed to generate interface I${repositoryName}:`, error);
      results.push({
        component: `I${repositoryName}`,
        type: 'interface',
        file: `backend/src/repositories/I${repositoryName}.ts`,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Generate service interfaces
  for (const [serviceName, contract] of Object.entries(contracts.services)) {
    try {
      const interfaceCode = await generateInterfaceCode(
        serviceName,
        'service',
        contract,
        enhancement,
        infrastructureContext
      );
      
      const filePath = path.join(projectPath, 'backend', 'src', 'services', `I${serviceName}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, interfaceCode, 'utf-8');
      
      results.push({
        component: `I${serviceName}`,
        type: 'interface',
        file: `backend/src/services/I${serviceName}.ts`,
        status: 'success',
        content: interfaceCode
      });
      
      console.log(`[AIArchitectureGenerator] ✅ Generated interface: I${serviceName}`);
      
    } catch (error: any) {
      console.error(`[AIArchitectureGenerator] ❌ Failed to generate interface I${serviceName}:`, error);
      results.push({
        component: `I${serviceName}`,
        type: 'interface',
        file: `backend/src/services/I${serviceName}.ts`,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // === PHASE 2: Generate Utility Files ===
  console.log('[AIArchitectureGenerator] Phase 2: Generating utility files...');
  
  // Generate Logger utility
  try {
    const loggerCode = await generateLoggerUtility(enhancement, infrastructureContext);
    const loggerPath = path.join(projectPath, 'backend', 'src', 'shared', 'utils', 'Logger.ts');
    await fs.mkdir(path.dirname(loggerPath), { recursive: true });
    await fs.writeFile(loggerPath, loggerCode, 'utf-8');
    
    results.push({
      component: 'Logger',
      type: 'utility',
      file: 'backend/src/shared/utils/Logger.ts',
      status: 'success',
      content: loggerCode
    });
    
    console.log('[AIArchitectureGenerator] ✅ Generated utility: Logger');
  } catch (error: any) {
    console.error('[AIArchitectureGenerator] ❌ Failed to generate Logger:', error);
  }
  
  // === PHASE 3: Generate Entities (Models) ===
  console.log('[AIArchitectureGenerator] Phase 3: Generating entities...');
  
  for (const [entityName, contract] of Object.entries(contracts.entities)) {
    try {
      const entityCode = await generateEntityCode(
        entityName,
        contract,
        enhancement,
        infrastructureContext
      );
      
      const filePath = path.join(projectPath, 'backend', 'src', 'models', `${entityName}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, entityCode, 'utf-8');
      
      results.push({
        component: entityName,
        type: 'entity',
        file: `backend/src/models/${entityName}.ts`,
        status: 'success',
        content: entityCode
      });
      
      console.log(`[AIArchitectureGenerator] ✅ Generated entity: ${entityName}`);
      
    } catch (error: any) {
      console.error(`[AIArchitectureGenerator] ❌ Failed to generate entity ${entityName}:`, error);
      results.push({
        component: entityName,
        type: 'entity',
        file: `backend/src/models/${entityName}.ts`,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // === PHASE 4: Generate Repositories (following contracts exactly) ===
  console.log('[AIArchitectureGenerator] Phase 4: Generating repositories...');
  
  for (const [repositoryName, contract] of Object.entries(contracts.repositories)) {
    try {
      const repositoryCode = await generateRepositoryCode(
        repositoryName,
        contract,
        enhancement,
        infrastructureContext,
        contracts
      );
      
      const filePath = path.join(projectPath, 'backend', 'src', 'repositories', `${repositoryName}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, repositoryCode, 'utf-8');
      
      results.push({
        component: repositoryName,
        type: 'repository',
        file: `backend/src/repositories/${repositoryName}.ts`,
        status: 'success',
        content: repositoryCode
      });
      
      console.log(`[AIArchitectureGenerator] ✅ Generated repository: ${repositoryName}`);
      
    } catch (error: any) {
      console.error(`[AIArchitectureGenerator] ❌ Failed to generate repository ${repositoryName}:`, error);
      results.push({
        component: repositoryName,
        type: 'repository',
        file: `backend/src/repositories/${repositoryName}.ts`,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // === PHASE 5: Generate Services (following contracts exactly) ===
  console.log('[AIArchitectureGenerator] Phase 5: Generating services...');
  
  for (const [serviceName, contract] of Object.entries(contracts.services)) {
    try {
      const serviceCode = await generateServiceCode(
        serviceName,
        contract,
        enhancement,
        infrastructureContext,
        contracts
      );
      
      const filePath = path.join(projectPath, 'backend', 'src', 'services', `${serviceName}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, serviceCode, 'utf-8');
      
      results.push({
        component: serviceName,
        type: 'service',
        file: `backend/src/services/${serviceName}.ts`,
        status: 'success',
        content: serviceCode
      });
      
      console.log(`[AIArchitectureGenerator] ✅ Generated service: ${serviceName}`);
      
    } catch (error: any) {
      console.error(`[AIArchitectureGenerator] ❌ Failed to generate service ${serviceName}:`, error);
      results.push({
        component: serviceName,
        type: 'service',
        file: `backend/src/services/${serviceName}.ts`,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // === PHASE 6: Generate Controllers (following contracts exactly) ===
  console.log('[AIArchitectureGenerator] Phase 6: Generating controllers...');
  
  for (const [controllerName, contract] of Object.entries(contracts.controllers)) {
    try {
      const controllerCode = await generateControllerCode(
        controllerName,
        contract,
        enhancement,
        infrastructureContext,
        contracts
      );
      
      const filePath = path.join(projectPath, 'backend', 'src', 'controllers', `${controllerName}.ts`);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, controllerCode, 'utf-8');
      
      results.push({
        component: controllerName,
        type: 'controller',
        file: `backend/src/controllers/${controllerName}.ts`,
        status: 'success',
        content: controllerCode
      });
      
      console.log(`[AIArchitectureGenerator] ✅ Generated controller: ${controllerName}`);
      
    } catch (error: any) {
      console.error(`[AIArchitectureGenerator] ❌ Failed to generate controller ${controllerName}:`, error);
      results.push({
        component: controllerName,
        type: 'controller',
        file: `backend/src/controllers/${controllerName}.ts`,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // === PHASE 7: Generate Index.ts (main entry point) ===
  console.log('[AIArchitectureGenerator] Phase 7: Generating index.ts...');
  
  try {
    const indexCode = await generateIndexCode(contracts, enhancement, infrastructureContext);
    const indexPath = path.join(projectPath, 'backend', 'src', 'index.ts');
    await fs.writeFile(indexPath, indexCode, 'utf-8');
    
    results.push({
      component: 'index',
      type: 'entry',
      file: 'backend/src/index.ts',
      status: 'success',
      content: indexCode
    });
    
    console.log('[AIArchitectureGenerator] ✅ Generated entry point: index.ts');
  } catch (error: any) {
    console.error('[AIArchitectureGenerator] ❌ Failed to generate index.ts:', error);
    results.push({
      component: 'index',
      type: 'entry',
      file: 'backend/src/index.ts',
      status: 'error',
      error: error.message
    });
  }
  
  return results;
}

/**
 * Generate enhanced code for a specific component
 */
async function generateEnhancedComponentCode(
  componentName: string,
  componentType: 'entity' | 'service' | 'controller' | 'repository',
  contract: any,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext,
  contracts: FunctionSignatureContract
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate enhanced code for a component based on AI suggestions and infrastructure context.

**COMPONENT:**
- Name: ${componentName}
- Type: ${componentType}
- Contract: ${JSON.stringify(contract, null, 2)}

**AI ENHANCEMENT SUGGESTIONS:**
${JSON.stringify(enhancement, null, 2)}

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(infrastructureContext, null, 2)}

**ALL CONTRACTS (for context):**
${JSON.stringify(contracts, null, 2)}

**TASK:**
Generate enhanced TypeScript code that:
1. **Implements the contract** exactly as specified
2. **Incorporates AI suggestions** for improvements
3. **Uses infrastructure context** (AWS SDK, Redis, database connections, etc.)
4. **Adds error handling** and validation
5. **Includes caching patterns** where appropriate
6. **Follows the suggested architecture pattern**

**REQUIREMENTS:**
- Use the infrastructure context (database connections, AWS services, etc.)
- Implement caching with Redis if available
- Add proper error handling and logging
- Include validation and type safety
- Follow the AI enhancement suggestions
- Make it production-ready

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript code. No explanations, no markdown, no code fences.

Generate the enhanced ${componentType} code for ${componentName}:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  
  // Clean the response (remove markdown, explanations, etc.)
  return cleanAIResponse(rawResponse);
}

/**
 * Clean AI response to extract only code
 */
function cleanAIResponse(response: string): string {
  // Remove markdown code blocks
  let cleaned = response.replace(/```typescript\n?/g, '').replace(/```ts\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Remove explanatory text before code starts
  const codeStartPatterns = [
    /^.*?(import\s+)/,
    /^.*?(export\s+)/,
    /^.*?(class\s+)/,
    /^.*?(interface\s+)/,
    /^.*?(type\s+)/,
    /^.*?(enum\s+)/,
    /^.*?(const\s+)/,
    /^.*?(let\s+)/,
    /^.*?(var\s+)/,
    /^.*?(function\s+)/
  ];
  
  for (const pattern of codeStartPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(match.index!);
      break;
    }
  }
  
  return cleaned;
} 

/**
 * Generate interface code for repositories and services
 */
async function generateInterfaceCode(
  componentName: string,
  componentType: 'repository' | 'service',
  contract: any,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate an interface for a ${componentType} based on the contract.

**COMPONENT:**
- Name: ${componentName}
- Type: ${componentType}
- Contract: ${JSON.stringify(contract, null, 2)}

**TASK:**
Generate a TypeScript interface that:
1. **Defines the exact method signatures** from the contract
2. **Uses proper TypeScript types**
3. **Follows naming conventions** (I${componentName})
4. **Includes all methods** specified in the contract

**REQUIREMENTS:**
- Interface name should be I${componentName}
- Include all methods from the contract implementation
- Use proper TypeScript syntax
- Export the interface
- Fix TypeScript issues:
  - Export the interface properly: export interface I${componentName}
  - Use proper types for all method parameters
  - Use proper return types for all methods
  - Handle optional parameters correctly

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript interface code. No explanations, no markdown, no code fences.

Generate the interface for I${componentName}:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Generate Logger utility
 */
async function generateLoggerUtility(
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate a simple Logger utility class.

**TASK:**
Generate a TypeScript Logger utility that:
1. **Provides basic logging methods** (info, error, warn, debug)
2. **Includes timestamp**
3. **Is simple and focused**

**REQUIREMENTS:**
- Class name: Logger
- Methods: info, error, warn, debug
- Include timestamp in logs
- Keep it simple and focused
- Export the class

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript Logger code. No explanations, no markdown, no code fences.

Generate the Logger utility:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Generate entity code
 */
async function generateEntityCode(
  entityName: string,
  contract: any,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate an entity class based on the contract.

**ENTITY:**
- Name: ${entityName}
- Contract: ${JSON.stringify(contract, null, 2)}

**TASK:**
Generate a TypeScript entity class that:
1. **Implements all properties** from the contract
2. **Uses proper TypeScript types**
3. **Includes constructor and methods**
4. **Follows entity patterns**

**REQUIREMENTS:**
- Class name: ${entityName}
- Include all properties from the contract
- Use proper TypeScript syntax
- Export the class
- Fix TypeScript issues:
  - Export the class properly: export class ${entityName}
  - Use proper types for all properties
  - Handle optional properties correctly
  - Use proper constructor parameter types

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript entity code. No explanations, no markdown, no code fences.

Generate the entity for ${entityName}:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Generate repository code following contracts exactly
 */
async function generateRepositoryCode(
  repositoryName: string,
  contract: any,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext,
  contracts: FunctionSignatureContract
): Promise<string> {
  // Determine database type from infrastructure context
  const databaseType = infrastructureContext.databaseType || 'postgresql';
  const isDynamoDB = databaseType === 'dynamodb';
  const isPostgreSQL = databaseType === 'postgresql';
  
  const prompt = `You are an expert TypeScript developer. Generate repository code that follows the contract EXACTLY.

**REPOSITORY:**
- Name: ${repositoryName}
- Contract: ${JSON.stringify(contract, null, 2)}

**INFRASTRUCTURE CONTEXT:**
- Database Type: ${databaseType}
- Is DynamoDB: ${isDynamoDB}
- Is PostgreSQL: ${isPostgreSQL}
- DynamoDB Table: ${infrastructureContext.dynamoDbTableName || 'Not configured'}
- Database URL: ${infrastructureContext.databaseUrl || 'Not configured'}

**TASK:**
Generate TypeScript repository code that:
1. **Implements the contract EXACTLY** - use the constructor, methods, and signatures from the contract
2. **Implements the interface** I${repositoryName}
3. **Uses the correct database** based on infrastructure context:
   - If DynamoDB: Use AWS SDK v3 DynamoDB client
   - If PostgreSQL: Use pg Pool
4. **Adds basic error handling**

**REQUIREMENTS:**
- Class name: ${repositoryName}
- Implement interface: I${repositoryName}
- Use the exact constructor from the contract
- Implement all methods from the contract
- Use the correct database implementation:
  ${isDynamoDB ? `
  - Import AWS SDK v3: import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
  - Import DynamoDB Document Client: import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
  - Use DynamoDB operations (GetCommand, PutCommand, DeleteCommand, ScanCommand)
  - Use table name: ${infrastructureContext.dynamoDbTableName || 'notes'}
  ` : `
  - Import pg: import { Pool } from 'pg';
  - Use PostgreSQL operations (query with SQL)
  - Use connection string: ${infrastructureContext.databaseUrl || 'postgresql://localhost:5432/notes'}
  `}
- Add basic error handling
- Keep it simple and focused
- Fix TypeScript issues:
  - Export the class properly: export class ${repositoryName}
  - Handle errors properly with try-catch
  - Use proper types for all parameters
  - Handle undefined values properly
  - Use proper return types

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript repository code. No explanations, no markdown, no code fences.

Generate the repository for ${repositoryName}:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Generate service code following contracts exactly
 */
async function generateServiceCode(
  serviceName: string,
  contract: any,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext,
  contracts: FunctionSignatureContract
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate service code that follows the contract EXACTLY.

**SERVICE:**
- Name: ${serviceName}
- Contract: ${JSON.stringify(contract, null, 2)}

**TASK:**
Generate TypeScript service code that:
1. **Implements the contract EXACTLY** - use the constructor, methods, and signatures from the contract
2. **Implements the interface** I${serviceName}
3. **Uses the repository dependency** from the contract
4. **Adds basic error handling**
5. **Includes simple business logic**

**REQUIREMENTS:**
- Class name: ${serviceName}
- Implement interface: I${serviceName}
- Use the exact constructor from the contract
- Implement all methods from the contract
- Use the repository dependency properly
- Add basic error handling
- Keep it simple and focused
- Fix TypeScript issues:
  - Export the class properly: export class ${serviceName}
  - Handle errors properly with try-catch
  - Use proper types for all parameters
  - Handle undefined values properly
  - Use proper return types

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript service code. No explanations, no markdown, no code fences.

Generate the service for ${serviceName}:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Generate controller code following contracts exactly
 */
async function generateControllerCode(
  controllerName: string,
  contract: any,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext,
  contracts: FunctionSignatureContract
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate controller code that follows the contract EXACTLY.

**CONTROLLER:**
- Name: ${controllerName}
- Contract: ${JSON.stringify(contract, null, 2)}

**TASK:**
Generate TypeScript controller code that:
1. **Implements the contract EXACTLY** - use the routes, handlers, and dependencies from the contract
2. **Uses the service dependency** from the contract
3. **Implements all routes** from the contract
4. **Adds basic error handling**
5. **Includes simple route handlers**

**REQUIREMENTS:**
- Class name: ${controllerName}
- Use the exact routes from the contract
- Implement all route handlers from the contract
- Use the service dependency properly
- Add basic error handling
- Keep it simple and focused
- Fix TypeScript issues:
  - Export the class properly: export class ${controllerName}
  - Route handlers should return void (not res.json())
  - Handle errors properly with try-catch
  - Use proper types for Request, Response
  - Handle undefined values properly

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript controller code. No explanations, no markdown, no code fences.

Generate the controller for ${controllerName}:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Generate index.ts (main entry point)
 */
async function generateIndexCode(
  contracts: FunctionSignatureContract,
  enhancement: AIArchitectureEnhancement,
  infrastructureContext: InfrastructureContext
): Promise<string> {
  // Determine database type from infrastructure context
  const databaseType = infrastructureContext.databaseType || 'postgresql';
  const isDynamoDB = databaseType === 'dynamodb';
  const isPostgreSQL = databaseType === 'postgresql';
  
  const prompt = `You are an expert TypeScript developer. Generate the main index.ts entry point.

**CONTRACTS:**
${JSON.stringify(contracts, null, 2)}

**INFRASTRUCTURE CONTEXT:**
- Database Type: ${databaseType}
- Is DynamoDB: ${isDynamoDB}
- Is PostgreSQL: ${isPostgreSQL}
- DynamoDB Table: ${infrastructureContext.dynamoDbTableName || 'Not configured'}
- Database URL: ${infrastructureContext.databaseUrl || 'Not configured'}

**TASK:**
Generate TypeScript index.ts that:
1. **Sets up Express app** with basic middleware
2. **Imports all controllers** from the contracts
3. **Sets up routes** from the contracts
4. **Sets up basic error handling**
5. **Configures for basic deployment**
6. **Sets up the correct database connection** based on infrastructure context

**REQUIREMENTS:**
- Import all necessary dependencies
- Set up Express app with basic middleware
- Import and use all controllers from contracts
- Set up routes from the contracts
- Set up basic error handling
- Keep it simple and focused
- Set up the correct database connection:
  ${isDynamoDB ? `
  - Import AWS SDK v3: import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
  - Import DynamoDB Document Client: import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
  - Create DynamoDB client with region: ${infrastructureContext.awsRegion || 'us-east-1'}
  - Pass DynamoDB client to repository constructor
  ` : `
  - Import pg: import { Pool } from 'pg';
  - Create PostgreSQL pool with connection string: ${infrastructureContext.databaseUrl || 'postgresql://localhost:5432/notes'}
  - Pass PostgreSQL pool to repository constructor
  `}
- Fix TypeScript issues:
  - Use process.env['DATABASE_URL'] instead of process.env.DATABASE_URL
  - Handle undefined values properly
  - Ensure all imports are properly exported
  - Use proper error handling with unknown type
  - Return void from route handlers (don't return res.json())

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript index.ts code. No explanations, no markdown, no code fences.

Generate the index.ts entry point:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
} 