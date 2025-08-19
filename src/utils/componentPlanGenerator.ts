// src/utils/componentPlanGenerator.ts
import { openai, OPENAI_MODEL } from '../config/aiProvider';

/**
 * High-Level Component Plan Interface
 * This represents the structured component plan with contracts, not file structures
 */
export interface ComponentPlan {
  // Core entities from class diagrams
  entities: Array<{
    name: string;
    properties: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
    description?: string;
  }>;
  
  // Business logic services
  services: Array<{
    name: string;
    methods: Array<{
      name: string;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        description?: string;
      }>;
      returnType: string;
      description?: string;
    }>;
    dependencies: string[]; // Other services this depends on
    description?: string;
  }>;
  
  // API controllers/routes
  controllers: Array<{
    name: string;
    routes: Array<{
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      calls: string; // Method name to call on service
      parameters?: Array<{
        name: string;
        type: string;
        source: 'body' | 'params' | 'query' | 'headers';
        required: boolean;
      }>;
      description?: string;
    }>;
    dependencies: string[]; // Services this controller depends on
    description?: string;
  }>;
  
  // Data access layer
  repositories: Array<{
    name: string;
    methods: Array<{
      name: string;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        description?: string;
      }>;
      returnType: string;
      description?: string;
    }>;
    entity: string; // Which entity this repository handles
    description?: string;
  }>;
  
  // Infrastructure integration
  integration: {
    database: {
      type: 'postgresql' | 'mysql' | 'mongodb' | 'dynamodb';
      tables: string[]; // Entity names that become tables
      connectionString?: string;
    };
    storage?: {
      type: 's3' | 'local';
      buckets?: string[];
    };
    auth?: {
      type: 'cognito' | 'jwt' | 'oauth';
      userPool?: string;
    };
    api?: {
      type: 'api-gateway' | 'express';
      baseUrl?: string;
    };
  };
  
  // Dependencies between components
  dependencies: Array<{
    from: string;
    to: string;
    type: 'uses' | 'depends_on' | 'implements';
    description?: string;
  }>;
  
  // Generation metadata
  metadata: {
    generatedFrom: 'uml' | 'prompt' | 'hybrid';
    umlDiagrams?: {
      classDiagram?: string;
      sequenceDiagram?: string;
      componentDiagram?: string;
    };
    infrastructureContext?: any;
    semanticContext?: string;
  };
}

/**
 * Generate high-level component plan from UML diagrams
 */
export async function generateComponentPlan(
  umlDiagrams: {
    classDiagram?: string;
    sequenceDiagram?: string;
    componentDiagram?: string;
  },
  infrastructureContext?: any,
  semanticContext?: string
): Promise<ComponentPlan> {
  console.log('[ComponentPlanGenerator] Generating high-level component plan...');
  
  // Build context sections for the prompt
  const infrastructureSection = infrastructureContext ? 
    `\n\n**INFRASTRUCTURE CONTEXT:**\n${JSON.stringify(infrastructureContext, null, 2)}` : '';
  
  const semanticSection = semanticContext ? 
    `\n\n**SEMANTIC CONTEXT:**\n${semanticContext}` : '';
  
  const prompt = `You are an expert software architect. Create a HIGH-LEVEL COMPONENT PLAN from the UML diagrams. This plan should define the structure and contracts, NOT implementation details.

**CRITICAL REQUIREMENTS:**
1. **STRUCTURE ONLY:** Generate component contracts, method signatures, and relationships
2. **NO IMPLEMENTATION:** Do NOT include actual code implementations
3. **CONSISTENT SIGNATURES:** Method signatures must be consistent across all layers
4. **INFRASTRUCTURE AWARE:** Consider the provided infrastructure context
5. **SEMANTIC PATTERNS:** Follow existing patterns from semantic context if available

**UML ANALYSIS REQUIREMENTS:**

**FROM CLASS DIAGRAMS:**
- Extract entities (classes) and their properties
- Define property types and requirements
- Identify relationships between entities
- Extract method signatures for services and repositories

**FROM SEQUENCE DIAGRAMS:**
- Extract method call sequences
- Define controller routes and their service calls
- Identify parameter passing patterns
- Define return value expectations

**FROM COMPONENT DIAGRAMS:**
- Extract component boundaries and responsibilities
- Define component dependencies
- Identify external integrations

**COMPONENT PLAN STRUCTURE:**

**Entities:** Core data models from class diagrams
- Extract class names as entity names
- Extract properties with types and requirements
- Use string types for dates (createdAt: string, updatedAt: string)

**Services:** Business logic layer
- Extract service classes and their methods
- Define method signatures with parameters and return types
- Identify service dependencies
- Focus on business operations, not data access

**Controllers:** API layer
- Extract controller classes and their routes
- Define HTTP methods, paths, and service method calls
- Identify parameter sources (body, params, query, headers)
- Map routes to service method calls

**Repositories:** Data access layer
- Extract repository classes and their methods
- Define CRUD operation signatures
- Associate repositories with entities
- Focus on data access patterns

**Integration:** Infrastructure mapping
- Map entities to database tables
- Identify storage requirements
- Define authentication patterns
- Map to API gateway or Express patterns

**Dependencies:** Component relationships
- Define which components use/depend on others
- Identify implementation relationships
- Map service-to-repository dependencies

**RESPONSE FORMAT:**
Return ONLY a JSON object with the following structure:

{
  "entities": [
    {
      "name": "User",
      "properties": [
        { "name": "id", "type": "string", "required": true },
        { "name": "name", "type": "string", "required": true },
        { "name": "email", "type": "string", "required": true },
        { "name": "createdAt", "type": "string", "required": true }
      ],
      "description": "User entity for authentication and profile management"
    }
  ],
  "services": [
    {
      "name": "UserService",
      "methods": [
        {
          "name": "createUser",
          "parameters": [
            { "name": "userData", "type": "UserCreateInput", "required": true }
          ],
          "returnType": "User",
          "description": "Create a new user"
        },
        {
          "name": "getUserById",
          "parameters": [
            { "name": "id", "type": "string", "required": true }
          ],
          "returnType": "User | null",
          "description": "Get user by ID"
        }
      ],
      "dependencies": ["UserRepository"],
      "description": "Business logic for user operations"
    }
  ],
  "controllers": [
    {
      "name": "UserController",
      "routes": [
        {
          "path": "/user/:id",
          "method": "GET",
          "calls": "getUserById",
          "parameters": [
            { "name": "id", "type": "string", "source": "params", "required": true }
          ],
          "description": "Get user by ID"
        },
        {
          "path": "/user",
          "method": "POST",
          "calls": "createUser",
          "parameters": [
            { "name": "userData", "type": "UserCreateInput", "source": "body", "required": true }
          ],
          "description": "Create a new user"
        }
      ],
      "dependencies": ["UserService"],
      "description": "API endpoints for user operations"
    }
  ],
  "repositories": [
    {
      "name": "UserRepository",
      "methods": [
        {
          "name": "create",
          "parameters": [
            { "name": "userData", "type": "UserCreateInput", "required": true }
          ],
          "returnType": "User",
          "description": "Create user in database"
        },
        {
          "name": "findById",
          "parameters": [
            { "name": "id", "type": "string", "required": true }
          ],
          "returnType": "User | null",
          "description": "Find user by ID"
        }
      ],
      "entity": "User",
      "description": "Data access for User entity"
    }
  ],
  "integration": {
    "database": {
      "type": "postgresql",
      "tables": ["User", "Product"],
      "connectionString": "process.env.DATABASE_URL"
    },
    "storage": {
      "type": "s3",
      "buckets": ["user-uploads"]
    },
    "auth": {
      "type": "cognito",
      "userPool": "process.env.COGNITO_USER_POOL_ID"
    },
    "api": {
      "type": "api-gateway",
      "baseUrl": "process.env.API_BASE_URL"
    }
  },
  "dependencies": [
    {
      "from": "UserController",
      "to": "UserService",
      "type": "uses",
      "description": "Controller uses service for business logic"
    },
    {
      "from": "UserService",
      "to": "UserRepository",
      "type": "uses",
      "description": "Service uses repository for data access"
    }
  ],
  "metadata": {
    "generatedFrom": "uml",
    "umlDiagrams": {
      "classDiagram": "class diagram content",
      "sequenceDiagram": "sequence diagram content",
      "componentDiagram": "component diagram content"
    },
    "infrastructureContext": "infrastructure context",
    "semanticContext": "semantic context"
  }
}

**CRITICAL: Generate ONLY the component plan structure. Do NOT include any actual code implementations.**
**CRITICAL: Ensure method signatures are consistent across services, controllers, and repositories.**
**CRITICAL: Use string types for dates (createdAt: string, updatedAt: string) for JSON compatibility.**
**CRITICAL: Follow the infrastructure context for database, storage, and API patterns.**${infrastructureSection}${semanticSection}

**UML DIAGRAMS TO ANALYZE:**
${JSON.stringify(umlDiagrams, null, 2)}

Generate the component plan based on these UML diagrams.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.1, // Low temperature for consistent, structured output
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Clean and parse the response
    const cleanedResponse = cleanAIResponse(content);
    const componentPlan = JSON.parse(cleanedResponse) as ComponentPlan;
    
    // Validate the component plan
    validateComponentPlan(componentPlan);
    
    console.log('[ComponentPlanGenerator] ✅ Component plan generated successfully');
    console.log(`[ComponentPlanGenerator] Generated ${componentPlan.entities.length} entities, ${componentPlan.services.length} services, ${componentPlan.controllers.length} controllers`);
    
    return componentPlan;
    
  } catch (error: any) {
    console.error('[ComponentPlanGenerator] ❌ Error generating component plan:', error);
    throw new Error(`Failed to generate component plan: ${error.message}`);
  }
}

/**
 * Clean AI response that contains markdown code blocks
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
  
  // If no JSON found, return empty component plan
  return JSON.stringify(getEmptyComponentPlan());
}

/**
 * Validate component plan structure
 */
function validateComponentPlan(plan: ComponentPlan): void {
  // Validate required fields
  if (!plan.entities || !Array.isArray(plan.entities)) {
    throw new Error('Component plan must have entities array');
  }
  
  if (!plan.services || !Array.isArray(plan.services)) {
    throw new Error('Component plan must have services array');
  }
  
  if (!plan.controllers || !Array.isArray(plan.controllers)) {
    throw new Error('Component plan must have controllers array');
  }
  
  if (!plan.repositories || !Array.isArray(plan.repositories)) {
    throw new Error('Component plan must have repositories array');
  }
  
  if (!plan.integration) {
    throw new Error('Component plan must have integration object');
  }
  
  if (!plan.dependencies || !Array.isArray(plan.dependencies)) {
    throw new Error('Component plan must have dependencies array');
  }
  
  // Validate method signature consistency
  validateMethodSignatureConsistency(plan);
}

/**
 * Validate method signature consistency across layers
 */
function validateMethodSignatureConsistency(plan: ComponentPlan): void {
  // Create a map of service methods
  const serviceMethods = new Map<string, Map<string, any>>();
  
  for (const service of plan.services) {
    const methodMap = new Map<string, any>();
    for (const method of service.methods) {
      methodMap.set(method.name, method);
    }
    serviceMethods.set(service.name, methodMap);
  }
  
  // Validate that controller calls match service methods
  for (const controller of plan.controllers) {
    for (const route of controller.routes) {
      const serviceName = controller.dependencies.find(dep => 
        plan.services.some(service => service.name === dep)
      );
      
      if (serviceName) {
        const serviceMethodMap = serviceMethods.get(serviceName);
        if (serviceMethodMap && !serviceMethodMap.has(route.calls)) {
          console.warn(`[ComponentPlanGenerator] Warning: Controller ${controller.name} calls undefined method ${route.calls} on service ${serviceName}`);
        }
      }
    }
  }
}

/**
 * Get empty component plan structure
 */
function getEmptyComponentPlan(): ComponentPlan {
  return {
    entities: [],
    services: [],
    controllers: [],
    repositories: [],
    integration: {
      database: {
        type: 'postgresql',
        tables: []
      }
    },
    dependencies: [],
    metadata: {
      generatedFrom: 'uml'
    }
  };
}

/**
 * Convert component plan to function contracts
 */
export function componentPlanToFunctionContracts(plan: ComponentPlan): any {
  const contracts: any = {
    services: {},
    controllers: {},
    repositories: {}
  };
  
  // Generate service contracts
  for (const service of plan.services) {
    contracts.services[service.name] = {
      methods: service.methods.map(method => ({
        name: method.name,
        signature: `${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${method.returnType}`,
        parameters: method.parameters,
        returnType: method.returnType,
        description: method.description
      }))
    };
  }
  
  // Generate controller contracts
  for (const controller of plan.controllers) {
    contracts.controllers[controller.name] = {
      routes: controller.routes.map(route => ({
        path: route.path,
        method: route.method,
        calls: route.calls,
        parameters: route.parameters || [],
        description: route.description
      }))
    };
  }
  
  // Generate repository contracts
  for (const repository of plan.repositories) {
    contracts.repositories[repository.name] = {
      entity: repository.entity,
      methods: repository.methods.map(method => ({
        name: method.name,
        signature: `${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${method.returnType}`,
        parameters: method.parameters,
        returnType: method.returnType,
        description: method.description
      }))
    };
  }
  
  return contracts;
}

/**
 * Generate TypeScript interfaces from component plan
 */
export function generateTypeScriptInterfaces(plan: ComponentPlan): string {
  let interfaces = '';
  
  // Generate entity interfaces
  for (const entity of plan.entities) {
    interfaces += `export interface ${entity.name} {\n`;
    for (const property of entity.properties) {
      const optional = property.required ? '' : '?';
      interfaces += `  ${property.name}${optional}: ${property.type};\n`;
    }
    interfaces += `}\n\n`;
  }
  
  // Generate service interfaces
  for (const service of plan.services) {
    interfaces += `export interface I${service.name} {\n`;
    for (const method of service.methods) {
      const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
      interfaces += `  ${method.name}(${params}): Promise<${method.returnType}>;\n`;
    }
    interfaces += `}\n\n`;
  }
  
  // Generate repository interfaces
  for (const repository of plan.repositories) {
    interfaces += `export interface I${repository.name} {\n`;
    for (const method of repository.methods) {
      const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
      interfaces += `  ${method.name}(${params}): Promise<${method.returnType}>;\n`;
    }
    interfaces += `}\n\n`;
  }
  
  return interfaces;
} 