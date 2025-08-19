import { openai, OPENAI_MODEL } from '../config/aiProvider';

export interface ClassMember {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isReadonly: boolean;
  description?: string;
}

export interface ClassMethod {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic: boolean;
  isAsync: boolean;
  isAbstract: boolean;
  description: string;
  throws?: string[];
}

export interface EnhancedClass {
  name: string;
  description: string;
  members: ClassMember[];
  methods: ClassMethod[];
  extends?: string;
  implements?: string[];
  dependencies: string[];
  filePath: string;
  package?: string;
}

export interface EnhancedClassDiagram {
  classes: EnhancedClass[];
  relationships: Array<{
    from: string;
    to: string;
    type: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'dependency' | 'implements';
    description?: string;
    multiplicity?: string;
  }>;
  packages: Array<{
    name: string;
    classes: string[];
    description?: string;
  }>;
  interfaces: Array<{
    name: string;
    description: string;
    methods: ClassMethod[];
    extends?: string[];
  }>;
}

/**
 * Generate enhanced class diagram with detailed class structures
 */
export async function generateEnhancedClassDiagram(
  userPrompt: string,
  existingCodePlan?: any
): Promise<EnhancedClassDiagram> {
  console.log('[EnhancedClassDiagramGenerator] Generating enhanced class diagram...');
  
  const prompt = `You are an expert software architect and UML designer. Analyze the user requirements and create a comprehensive class diagram with detailed class structures, including all members, methods, relationships, and dependencies.

**USER REQUIREMENTS:**
${userPrompt}

**EXISTING CODE PLAN (if any):**
${existingCodePlan ? JSON.stringify(existingCodePlan, null, 2) : 'None provided'}

**TASK:**
Create a detailed class diagram that includes:

1. **Class Structures** - Complete class definitions with all members and methods
2. **Method Signatures** - Detailed method signatures with parameters, return types, and visibility
3. **Class Members** - Properties, fields, and constants with types and visibility
4. **Relationships** - Inheritance, composition, aggregation, associations, and dependencies
5. **Packages/Modules** - Logical grouping of related classes
6. **Interfaces** - Interface definitions with method contracts
7. **Dependencies** - Import relationships and external dependencies

**REQUIREMENTS:**
- Use TypeScript/JavaScript patterns and conventions
- Include proper visibility modifiers (public, private, protected)
- Use async/await patterns for asynchronous operations
- Include proper error handling patterns
- Use dependency injection patterns where appropriate
- Follow SOLID principles and design patterns
- Include proper TypeScript types and interfaces
- Consider database operations, API calls, and external services
- Include validation, error handling, and logging patterns

**CLASS STRUCTURE PATTERNS:**

**For Service Classes:**
- Business logic methods with proper error handling
- Dependency injection for external services
- Async methods for database/API operations
- Validation methods for input data
- Logging and monitoring methods

**For Model/Entity Classes:**
- Data properties with proper types
- Constructor with parameter validation
- Getter/setter methods where needed
- Data validation methods
- Serialization/deserialization methods

**For Repository/Data Access Classes:**
- CRUD operations (create, read, update, delete)
- Query methods with filtering and pagination
- Transaction handling methods
- Connection management methods
- Error handling for database operations

**For Controller Classes:**
- HTTP request handling methods
- Request validation methods
- Response formatting methods
- Error handling and logging
- Authentication/authorization methods

**For Utility Classes:**
- Static helper methods
- Pure functions where possible
- Validation and formatting methods
- Data transformation methods
- Configuration and setup methods

**RESPONSE FORMAT:**
Return a JSON object with this exact structure:

{
  "classes": [
    {
      "name": "ClassName",
      "description": "What this class is responsible for",
      "members": [
        {
          "name": "memberName",
          "type": "string|number|boolean|CustomType|CustomType[]",
          "visibility": "public|private|protected",
          "isStatic": true|false,
          "isReadonly": true|false,
          "description": "What this member stores"
        }
      ],
      "methods": [
        {
          "name": "methodName",
          "parameters": [
            {
              "name": "paramName",
              "type": "string|number|boolean|CustomType",
              "required": true|false,
              "defaultValue": "default value if any",
              "description": "What this parameter is for"
            }
          ],
          "returnType": "string|number|boolean|CustomType|void|Promise<Type>",
          "visibility": "public|private|protected",
          "isStatic": true|false,
          "isAsync": true|false,
          "isAbstract": true|false,
          "description": "What this method does",
          "throws": ["ErrorType1", "ErrorType2"]
        }
      ],
      "extends": "ParentClass",
      "implements": ["Interface1", "Interface2"],
      "dependencies": ["../services/ServiceName", "../models/ModelName"],
      "filePath": "src/services/ClassName.ts",
      "package": "services"
    }
  ],
  "relationships": [
    {
      "from": "ClassName1",
      "to": "ClassName2",
      "type": "inheritance|composition|aggregation|association|dependency|implements",
      "description": "How ClassName1 relates to ClassName2",
      "multiplicity": "1|*|1..*|0..1"
    }
  ],
  "packages": [
    {
      "name": "packageName",
      "classes": ["ClassName1", "ClassName2"],
      "description": "What this package contains"
    }
  ],
  "interfaces": [
    {
      "name": "InterfaceName",
      "description": "What this interface defines",
      "methods": [
        {
          "name": "methodName",
          "parameters": [...],
          "returnType": "Type",
          "description": "What this method does"
        }
      ],
      "extends": ["ParentInterface1", "ParentInterface2"]
    }
  ]
}

**CRITICAL:**
- Return ONLY the JSON object, no explanations or markdown
- Ensure all class structures are realistic and implementable
- Include proper TypeScript types and patterns
- Make sure relationships and dependencies are logical
- Include error handling and validation patterns
- Use async/await for operations that might be asynchronous
- Follow naming conventions and best practices
- Consider the complete application architecture

Generate the enhanced class diagram now:`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content;
    if (content) {
      // Clean the response and parse JSON
      const cleanedContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      try {
        const classDiagram = JSON.parse(cleanedContent);
        console.log(`[EnhancedClassDiagramGenerator] Successfully generated class diagram with ${classDiagram.classes?.length || 0} classes`);
        return classDiagram;
      } catch (parseError) {
        console.error('[EnhancedClassDiagramGenerator] Failed to parse class diagram:', parseError);
        throw new Error('Failed to parse class diagram from AI response');
      }
    } else {
      throw new Error('No content returned from AI for class diagram generation');
    }
  } catch (error) {
    console.error('[EnhancedClassDiagramGenerator] Error generating class diagram:', error);
    throw error;
  }
}

/**
 * Convert enhanced class diagram to method signatures for code generation
 */
export function convertClassDiagramToMethodSignatures(classDiagram: EnhancedClassDiagram): any {
  console.log('[EnhancedClassDiagramGenerator] Converting class diagram to method signatures...');
  
  const methodSignatures = {
    classes: classDiagram.classes.map(cls => ({
      name: cls.name,
      description: cls.description,
      methods: cls.methods.map(method => ({
        name: method.name,
        parameters: method.parameters.map(param => ({
          name: param.name,
          type: param.type,
          required: param.required,
          description: param.description
        })),
        returnType: method.returnType,
        description: method.description,
        isAsync: method.isAsync,
        visibility: method.visibility
      })),
      properties: cls.members.map(member => ({
        name: member.name,
        type: member.type,
        visibility: member.visibility,
        description: member.description
      }))
    })),
    dependencies: classDiagram.relationships.map(rel => ({
      from: rel.from,
      to: rel.to,
      type: rel.type === 'inheritance' ? 'extends' : 
            rel.type === 'implements' ? 'implements' : 'uses',
      description: rel.description || `${rel.from} ${rel.type} ${rel.to}`
    }))
  };
  
  console.log(`[EnhancedClassDiagramGenerator] Converted ${methodSignatures.classes.length} classes to method signatures`);
  return methodSignatures;
}

/**
 * Generate file structure from enhanced class diagram
 */
export function generateFileStructureFromClassDiagram(classDiagram: EnhancedClassDiagram): any {
  console.log('[EnhancedClassDiagramGenerator] Generating file structure from class diagram...');
  
  const fileStructure = {
    backend: classDiagram.classes.map(cls => ({
      path: cls.filePath,
      content: '', // Will be generated later
      dependencies: cls.dependencies,
      description: cls.description,
      type: determineFileType(cls.filePath)
    }))
  };
  
  // Add interface files
  for (const intf of classDiagram.interfaces) {
    fileStructure.backend.push({
      path: `src/types/${intf.name}.ts`,
      content: '',
      dependencies: [],
      description: intf.description,
      type: 'interface'
    });
  }
  
  console.log(`[EnhancedClassDiagramGenerator] Generated file structure with ${fileStructure.backend.length} files`);
  return fileStructure;
}

/**
 * Determine file type based on path
 */
function determineFileType(filePath: string): string {
  if (filePath.includes('/services/')) return 'service';
  if (filePath.includes('/controllers/')) return 'controller';
  if (filePath.includes('/models/')) return 'model';
  if (filePath.includes('/repositories/')) return 'repository';
  if (filePath.includes('/utils/')) return 'utility';
  if (filePath.includes('/middleware/')) return 'middleware';
  if (filePath.includes('/types/')) return 'interface';
  if (filePath.includes('/config/')) return 'config';
  return 'service';
}

/**
 * Generate TypeScript interfaces from enhanced class diagram
 */
export function generateTypeScriptInterfacesFromClassDiagram(classDiagram: EnhancedClassDiagram): string {
  let interfaces = '';
  
  // Generate interfaces for classes
  for (const cls of classDiagram.classes) {
    interfaces += `export interface I${cls.name} {\n`;
    
    // Add properties
    for (const member of cls.members) {
      interfaces += `  ${member.name}: ${member.type};\n`;
    }
    
    // Add method signatures
    for (const method of cls.methods) {
      const params = method.parameters.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ');
      const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
      interfaces += `  ${method.name}(${params}): ${returnType};\n`;
    }
    
    interfaces += `}\n\n`;
  }
  
  // Generate interfaces for interfaces
  for (const intf of classDiagram.interfaces) {
    interfaces += `export interface ${intf.name} {\n`;
    
    // Add method signatures
    for (const method of intf.methods) {
      const params = method.parameters.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ');
      const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
      interfaces += `  ${method.name}(${params}): ${returnType};\n`;
    }
    
    interfaces += `}\n\n`;
  }
  
  return interfaces;
}

/**
 * Generate class diagram documentation
 */
export function generateClassDiagramDocumentation(classDiagram: EnhancedClassDiagram): string {
  let documentation = '# Enhanced Class Diagram Documentation\n\n';
  
  // Document packages
  if (classDiagram.packages && classDiagram.packages.length > 0) {
    documentation += `## Packages\n\n`;
    for (const pkg of classDiagram.packages) {
      documentation += `### ${pkg.name}\n\n`;
      documentation += `${pkg.description || 'No description'}\n\n`;
      documentation += `**Classes:** ${pkg.classes.join(', ')}\n\n`;
    }
  }
  
  // Document classes
  documentation += `## Classes\n\n`;
  for (const cls of classDiagram.classes) {
    documentation += `### ${cls.name}\n\n`;
    documentation += `${cls.description}\n\n`;
    
    if (cls.extends) {
      documentation += `**Extends:** ${cls.extends}\n\n`;
    }
    
    if (cls.implements && cls.implements.length > 0) {
      documentation += `**Implements:** ${cls.implements.join(', ')}\n\n`;
    }
    
    if (cls.members && cls.members.length > 0) {
      documentation += `#### Properties\n\n`;
      for (const member of cls.members) {
        documentation += `- **${member.name}** (${member.type}) - ${member.visibility}${member.isStatic ? ' static' : ''}${member.isReadonly ? ' readonly' : ''}\n`;
        if (member.description) {
          documentation += `  ${member.description}\n`;
        }
      }
      documentation += `\n`;
    }
    
    if (cls.methods && cls.methods.length > 0) {
      documentation += `#### Methods\n\n`;
      for (const method of cls.methods) {
        const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
        const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
        const modifiers = [method.visibility, method.isStatic ? 'static' : '', method.isAsync ? 'async' : '', method.isAbstract ? 'abstract' : ''].filter(Boolean).join(' ');
        
        documentation += `- **${method.name}(${params}): ${returnType}** - ${modifiers}\n`;
        documentation += `  ${method.description}\n`;
        
        if (method.throws && method.throws.length > 0) {
          documentation += `  **Throws:** ${method.throws.join(', ')}\n`;
        }
        documentation += `\n`;
      }
    }
    
    documentation += `---\n\n`;
  }
  
  // Document relationships
  if (classDiagram.relationships && classDiagram.relationships.length > 0) {
    documentation += `## Relationships\n\n`;
    for (const rel of classDiagram.relationships) {
      documentation += `- **${rel.from}** ${rel.type} **${rel.to}**${rel.multiplicity ? ` (${rel.multiplicity})` : ''}\n`;
      if (rel.description) {
        documentation += `  ${rel.description}\n`;
      }
      documentation += `\n`;
    }
  }
  
  return documentation;
} 