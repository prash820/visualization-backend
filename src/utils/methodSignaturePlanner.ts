import { openai, OPENAI_MODEL } from '../config/aiProvider';

export interface MethodSignature {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  returnType: string;
  description: string;
  isAsync: boolean;
  visibility: 'public' | 'private' | 'protected';
}

export interface ClassSignature {
  name: string;
  methods: MethodSignature[];
  properties: Array<{
    name: string;
    type: string;
    visibility: 'public' | 'private' | 'protected';
    description?: string;
  }>;
  description: string;
}

export interface CodePlanWithSignatures {
  classes: ClassSignature[];
  dependencies: Array<{
    from: string;
    to: string;
    type: 'uses' | 'extends' | 'implements';
    description: string;
  }>;
}

/**
 * Analyze user requirements and create method signatures for all classes
 */
export async function planMethodSignatures(
  userPrompt: string,
  existingCodePlan?: any
): Promise<CodePlanWithSignatures> {
  console.log('[MethodSignaturePlanner] Planning method signatures from user requirements...');
  
  const prompt = `You are an expert software architect. Analyze the user requirements and create detailed method signatures for all classes that need to be implemented.

**USER REQUIREMENTS:**
${userPrompt}

**EXISTING CODE PLAN (if any):**
${existingCodePlan ? JSON.stringify(existingCodePlan, null, 2) : 'None provided'}

**TASK:**
Create method signatures for all classes that need to be implemented. Focus on:
1. **Business Logic Methods** - Core functionality the app needs
2. **Data Access Methods** - Database operations, API calls
3. **Utility Methods** - Helper functions, validation, etc.
4. **Lifecycle Methods** - Initialization, cleanup, etc.

**REQUIREMENTS:**
- Use TypeScript with proper typing
- Include async/await for operations that might be asynchronous
- Use proper parameter types (string, number, boolean, custom interfaces)
- Include proper return types
- Add method descriptions explaining what each method does
- Ensure method signatures are consistent across related classes
- Use standard naming conventions (camelCase for methods, PascalCase for classes)
- Include proper visibility modifiers (public, private, protected)

**METHOD SIGNATURE PATTERNS:**

**For Services:**
- Business logic methods (e.g., processData, validateInput)
- Data transformation methods (e.g., transformData, formatResponse)
- Validation methods (e.g., validateUser, checkPermissions)

**For Models/Database Classes:**
- CRUD operations (e.g., create, read, update, delete)
- Query methods (e.g., findByField, findAll, findOne)
- Data manipulation (e.g., save, remove, update)

**For Controllers:**
- Request handling (e.g., handleRequest, processRequest)
- Response formatting (e.g., formatResponse, sendResponse)
- Error handling (e.g., handleError, logError)

**For Utilities:**
- Helper functions (e.g., formatDate, validateEmail)
- Data processing (e.g., parseData, transformData)
- Validation functions (e.g., isValid, validateInput)

**RESPONSE FORMAT:**
Return a JSON object with this exact structure:

{
  "classes": [
    {
      "name": "ClassName",
      "methods": [
        {
          "name": "methodName",
          "parameters": [
            {
              "name": "paramName",
              "type": "string|number|boolean|CustomType",
              "required": true,
              "description": "What this parameter is for"
            }
          ],
          "returnType": "string|number|boolean|CustomType|void|Promise<Type>",
          "description": "What this method does",
          "isAsync": true|false,
          "visibility": "public|private|protected"
        }
      ],
      "properties": [
        {
          "name": "propertyName",
          "type": "string|number|boolean|CustomType",
          "visibility": "public|private|protected",
          "description": "What this property stores"
        }
      ],
      "description": "What this class is responsible for"
    }
  ],
  "dependencies": [
    {
      "from": "ClassName1",
      "to": "ClassName2",
      "type": "uses|extends|implements",
      "description": "How ClassName1 relates to ClassName2"
    }
  ]
}

**CRITICAL:**
- Return ONLY the JSON object, no explanations or markdown
- Ensure all method signatures are realistic and implementable
- Make sure parameter types and return types are consistent
- Include proper error handling patterns in method signatures
- Use async/await for operations that might take time (database, API calls)
- Keep method signatures simple but complete

Generate the method signatures now:`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content;
    if (content) {
      // Clean the response and parse JSON
      const cleanedContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      try {
        const signatures = JSON.parse(cleanedContent);
        console.log(`[MethodSignaturePlanner] Successfully planned ${signatures.classes?.length || 0} classes with method signatures`);
        return signatures;
      } catch (parseError) {
        console.error('[MethodSignaturePlanner] Failed to parse method signatures:', parseError);
        throw new Error('Failed to parse method signatures from AI response');
      }
    } else {
      throw new Error('No content returned from AI for method signature planning');
    }
  } catch (error) {
    console.error('[MethodSignaturePlanner] Error planning method signatures:', error);
    throw error;
  }
}

/**
 * Validate method signatures for consistency and completeness
 */
export function validateMethodSignatures(signatures: CodePlanWithSignatures): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!signatures.classes || !Array.isArray(signatures.classes)) {
    errors.push('No classes defined in method signatures');
    return { isValid: false, errors };
  }
  
  for (const classSig of signatures.classes) {
    // Validate class name
    if (!classSig.name || typeof classSig.name !== 'string') {
      errors.push(`Invalid class name: ${classSig.name}`);
    }
    
    // Validate methods
    if (!classSig.methods || !Array.isArray(classSig.methods)) {
      errors.push(`No methods defined for class: ${classSig.name}`);
      continue;
    }
    
    for (const method of classSig.methods) {
      // Validate method name
      if (!method.name || typeof method.name !== 'string') {
        errors.push(`Invalid method name in class ${classSig.name}: ${method.name}`);
      }
      
      // Validate parameters
      if (!method.parameters || !Array.isArray(method.parameters)) {
        errors.push(`No parameters defined for method ${classSig.name}.${method.name}`);
        continue;
      }
      
      for (const param of method.parameters) {
        if (!param.name || !param.type) {
          errors.push(`Invalid parameter in ${classSig.name}.${method.name}: ${param.name}`);
        }
      }
      
      // Validate return type
      if (!method.returnType) {
        errors.push(`No return type defined for method ${classSig.name}.${method.name}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate TypeScript interfaces from method signatures
 */
export function generateTypeScriptInterfaces(signatures: CodePlanWithSignatures): string {
  let interfaces = '';
  
  for (const classSig of signatures.classes) {
    // Generate interface for the class
    interfaces += `export interface I${classSig.name} {\n`;
    
    // Add properties
    if (classSig.properties && classSig.properties.length > 0) {
      for (const prop of classSig.properties) {
        interfaces += `  ${prop.name}: ${prop.type};\n`;
      }
    }
    
    // Add method signatures
    for (const method of classSig.methods) {
      const params = method.parameters.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}`).join(', ');
      const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
      interfaces += `  ${method.name}(${params}): ${returnType};\n`;
    }
    
    interfaces += `}\n\n`;
  }
  
  return interfaces;
}

/**
 * Generate method signature documentation
 */
export function generateMethodDocumentation(signatures: CodePlanWithSignatures): string {
  let documentation = '# Method Signatures Documentation\n\n';
  
  for (const classSig of signatures.classes) {
    documentation += `## ${classSig.name}\n\n`;
    documentation += `${classSig.description}\n\n`;
    
    if (classSig.properties && classSig.properties.length > 0) {
      documentation += `### Properties\n\n`;
      for (const prop of classSig.properties) {
        documentation += `- **${prop.name}** (${prop.type}) - ${prop.description || 'No description'}\n`;
      }
      documentation += `\n`;
    }
    
    documentation += `### Methods\n\n`;
    for (const method of classSig.methods) {
      const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
      const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
      
      documentation += `#### ${method.name}(${params}): ${returnType}\n\n`;
      documentation += `${method.description}\n\n`;
      
      if (method.parameters.length > 0) {
        documentation += `**Parameters:**\n`;
        for (const param of method.parameters) {
          documentation += `- \`${param.name}\` (${param.type}) - ${param.description || 'No description'}\n`;
        }
        documentation += `\n`;
      }
    }
    
    documentation += `---\n\n`;
  }
  
  return documentation;
} 