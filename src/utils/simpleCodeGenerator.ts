// src/utils/simpleCodeGenerator.ts
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import fs from 'fs/promises';
import path from 'path';
import { InfrastructureContext } from '../types/infrastructure';

export interface UMLDiagrams {
  backendClass?: string;
  backendSequence?: string;
  backendComponent?: string;
}

export interface GenerationContext {
  projectPath: string;
  infrastructureContext: InfrastructureContext;
  umlDiagrams: UMLDiagrams;
  generatedFiles: Array<{
    path: string;
    content: string;
    type: 'interface' | 'entity' | 'repository' | 'service' | 'controller' | 'index';
  }>;
}

export interface GenerationResult {
  success: boolean;
  files: Array<{
    path: string;
    content: string;
    type: string;
  }>;
  error?: string;
}

/**
 * Simple Infrastructure-Aware Code Generator
 * 
 * Generates code directly from UML diagrams and infrastructure context
 * No intermediate files, no multiple sources of truth
 */
export class SimpleCodeGenerator {
  private context: GenerationContext;

  constructor(
    projectPath: string,
    infrastructureContext: InfrastructureContext,
    umlDiagrams: UMLDiagrams
  ) {
    this.context = {
      projectPath,
      infrastructureContext,
      umlDiagrams,
      generatedFiles: []
    };
  }

  /**
   * Generate complete backend code from UML diagrams and infrastructure
   */
  async generateBackend(): Promise<GenerationResult> {
    try {
      console.log('[SimpleCodeGenerator] Starting infrastructure-aware code generation...');
      
      // Step 1: Analyze UML diagrams to extract components
      const components = await this.analyzeUMLDiagrams();
      console.log(`[SimpleCodeGenerator] Extracted ${components.length} components from UML diagrams`);
      
      // Step 2: Generate code in dependency order (leaf to root)
      const generationOrder = this.determineGenerationOrder(components);
      
      for (const component of generationOrder) {
        console.log(`[SimpleCodeGenerator] Generating ${component.type}: ${component.name}`);
        
        const code = await this.generateComponent(component);
        if (code) {
          const filePath = this.getFilePath(component);
          await this.writeFile(filePath, code);
          
          this.context.generatedFiles.push({
            path: filePath,
            content: code,
            type: component.type
          });
          
          console.log(`[SimpleCodeGenerator] ✅ Generated: ${filePath}`);
        }
      }
      
      // Step 3: Generate index.ts (root)
      console.log('[SimpleCodeGenerator] Generating index.ts...');
      const indexCode = await this.generateIndexFile();
      const indexPath = path.join(this.context.projectPath, 'backend', 'src', 'index.ts');
      await this.writeFile(indexPath, indexCode);
      
      this.context.generatedFiles.push({
        path: indexPath,
        content: indexCode,
        type: 'index'
      });
      
      console.log('[SimpleCodeGenerator] ✅ Generated: index.ts');
      
      return {
        success: true,
        files: this.context.generatedFiles
      };
      
    } catch (error: any) {
      console.error('[SimpleCodeGenerator] Generation failed:', error);
      return {
        success: false,
        files: [],
        error: error.message
      };
    }
  }

  /**
   * Analyze UML diagrams to extract components
   */
  private async analyzeUMLDiagrams(): Promise<Array<{
    name: string;
    type: 'entity' | 'repository' | 'service' | 'controller';
    methods: Array<{
      name: string;
      parameters: Array<{ name: string; type: string; required: boolean }>;
      returnType: string;
    }>;
    dependencies: string[];
  }>> {
    const prompt = `Analyze these UML diagrams and extract the components for code generation.

**UML DIAGRAMS:**
- Class Diagram: ${this.context.umlDiagrams.backendClass || 'Not provided'}
- Sequence Diagram: ${this.context.umlDiagrams.backendSequence || 'Not provided'}
- Component Diagram: ${this.context.umlDiagrams.backendComponent || 'Not provided'}

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(this.context.infrastructureContext, null, 2)}

**TASK:**
Extract all components (entities, repositories, services, controllers) from the UML diagrams.
For each component, identify:
1. Name and type
2. Methods with parameters and return types
3. Dependencies on other components

**REQUIREMENTS:**
- Focus on the actual components shown in the diagrams
- Don't add extra components not in the diagrams
- Identify dependencies based on relationships in the diagrams
- Keep it simple and accurate

**RESPONSE FORMAT:**
Return a JSON array of components:
[
  {
    "name": "Note",
    "type": "entity",
    "methods": [
      {
        "name": "constructor",
        "parameters": [
          {"name": "id", "type": "string", "required": true},
          {"name": "title", "type": "string", "required": true}
        ],
        "returnType": "void"
      }
    ],
    "dependencies": []
  }
]

Extract the components:`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.1
    });

    const rawResponse = response.choices[0]?.message?.content || '';
    
    try {
      const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       rawResponse.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      throw new Error('No valid JSON found in response');
    } catch (error: any) {
      console.error('[SimpleCodeGenerator] Failed to parse components:', error);
      console.error('[SimpleCodeGenerator] Raw response:', rawResponse);
      
      // Return minimal components based on common patterns
      return [
        {
          name: 'Note',
          type: 'entity',
          methods: [
            {
              name: 'constructor',
              parameters: [
                { name: 'id', type: 'string', required: true },
                { name: 'title', type: 'string', required: true },
                { name: 'content', type: 'string', required: true }
              ],
              returnType: 'void'
            }
          ],
          dependencies: []
        }
      ];
    }
  }

  /**
   * Determine generation order (leaf to root)
   */
  private determineGenerationOrder(components: any[]): any[] {
    // Simple dependency-based ordering
    const order: any[] = [];
    const processed = new Set<string>();
    
    // First: entities (no dependencies)
    for (const component of components) {
      if (component.type === 'entity' && !processed.has(component.name)) {
        order.push(component);
        processed.add(component.name);
      }
    }
    
    // Second: repositories (depend on entities)
    for (const component of components) {
      if (component.type === 'repository' && !processed.has(component.name)) {
        order.push(component);
        processed.add(component.name);
      }
    }
    
    // Third: services (depend on repositories)
    for (const component of components) {
      if (component.type === 'service' && !processed.has(component.name)) {
        order.push(component);
        processed.add(component.name);
      }
    }
    
    // Fourth: controllers (depend on services)
    for (const component of components) {
      if (component.type === 'controller' && !processed.has(component.name)) {
        order.push(component);
        processed.add(component.name);
      }
    }
    
    return order;
  }

  /**
   * Generate code for a specific component
   */
  private async generateComponent(component: any): Promise<string> {
    const context = this.getGenerationContext(component);
    
    const prompt = `Generate TypeScript code for a ${component.type} component.

**COMPONENT:**
- Name: ${component.name}
- Type: ${component.type}
- Methods: ${JSON.stringify(component.methods, null, 2)}
- Dependencies: ${component.dependencies.join(', ')}

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(this.context.infrastructureContext, null, 2)}

**PREVIOUSLY GENERATED FILES:**
${context}

**TASK:**
Generate complete TypeScript code for this component that:
1. **Uses the correct infrastructure** (DynamoDB, RDS, S3, etc.)
2. **Implements all methods** from the component definition
3. **Uses proper TypeScript syntax** (exports, types, error handling)
4. **Integrates with previously generated components**
5. **Follows the infrastructure context** exactly

**REQUIREMENTS:**
- Export the class/interface properly
- Use infrastructure context for database connections
- Handle errors properly with try-catch
- Use proper TypeScript types
- Keep it simple and focused

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript code. No explanations, no markdown, no code fences.

Generate the ${component.type} code for ${component.name}:`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.1
    });

    const rawResponse = response.choices[0]?.message?.content || '';
    return this.cleanResponse(rawResponse);
  }

  /**
   * Generate index.ts file
   */
  private async generateIndexFile(): Promise<string> {
    const context = this.getGenerationContext({ name: 'index', type: 'index' });
    
    const prompt = `Generate the main index.ts entry point.

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(this.context.infrastructureContext, null, 2)}

**GENERATED COMPONENTS:**
${context}

**TASK:**
Generate TypeScript index.ts that:
1. **Sets up Express app** with basic middleware
2. **Imports all generated components**
3. **Sets up routes** based on the components
4. **Configures database connections** using infrastructure context
5. **Sets up error handling**

**REQUIREMENTS:**
- Import all necessary dependencies
- Set up Express app with basic middleware
- Import and use all generated components
- Set up routes based on the components
- Configure database connections from infrastructure context
- Set up basic error handling
- Use proper TypeScript syntax

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
    return this.cleanResponse(rawResponse);
  }

  /**
   * Get context of previously generated files for the current component
   */
  private getGenerationContext(currentComponent: any): string {
    const relevantFiles = this.context.generatedFiles.filter(file => {
      // Include files that this component might depend on
      if (currentComponent.type === 'repository') {
        return file.type === 'entity';
      }
      if (currentComponent.type === 'service') {
        return file.type === 'repository' || file.type === 'entity';
      }
      if (currentComponent.type === 'controller') {
        return file.type === 'service' || file.type === 'repository' || file.type === 'entity';
      }
      if (currentComponent.type === 'index') {
        return true; // Include all files for index.ts
      }
      return false;
    });

    return relevantFiles.map(file => 
      `File: ${file.path}\nContent:\n${file.content}\n`
    ).join('\n');
  }

  /**
   * Get file path for a component
   */
  private getFilePath(component: any): string {
    const basePath = path.join(this.context.projectPath, 'backend', 'src');
    
    switch (component.type) {
      case 'entity':
        return path.join(basePath, 'models', `${component.name}.ts`);
      case 'repository':
        return path.join(basePath, 'repositories', `${component.name}.ts`);
      case 'service':
        return path.join(basePath, 'services', `${component.name}.ts`);
      case 'controller':
        return path.join(basePath, 'controllers', `${component.name}.ts`);
      default:
        return path.join(basePath, `${component.name}.ts`);
    }
  }

  /**
   * Write file to disk
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Clean AI response
   */
  private cleanResponse(response: string): string {
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
} 