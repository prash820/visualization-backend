import fs from 'fs/promises';
import path from 'path';
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';

export interface ComponentDependency {
  name: string;
  type: 'frontend' | 'backend' | 'shared';
  category: string;
  dependencies: string[];
  dependents: string[];
  complexity: number;
  generationOrder: number;
  filePath: string;
  content?: string;
}

export interface DependencyGraph {
  components: Map<string, ComponentDependency>;
  sortedOrder: string[];
  cycles: string[][];
}

export interface GeneratedFile {
  path: string;
  content: string;
  dependencies: string[];
  description: string;
  category: string;
}

function sanitizeGeneratedCode(code: string): string {
  // Remove triple backticks and any language specifier
  let sanitized = code.replace(/^```[a-zA-Z]*\n?/gm, '').replace(/```$/gm, '');
  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();
  // Remove stray markdown explanations (lines not starting with // or valid code)
  // Optionally, comment out lines that look like explanations
  sanitized = sanitized.replace(/^(?!\s*\/\/|\s*\/\*|\s*\*|\s*import|\s*export|\s*class|\s*function|\s*const|\s*let|\s*var|\s*type|\s*interface|\s*enum|\s*\{|\s*\}|\s*\(|\s*\)|\s*\[|\s*\]|\s*\d+|\s*\').+/gm, match => {
    // If it's not code, comment it out
    return match.startsWith('//') ? match : '// ' + match;
  });
  return sanitized;
}

export class DependencyAwareCodeGenerator {
  private dependencyGraph: DependencyGraph;
  private generatedFiles: Map<string, GeneratedFile>;
  private projectPath: string;
  private jobId: string;

  constructor(projectPath: string, jobId: string) {
    this.projectPath = projectPath;
    this.jobId = jobId;
    this.dependencyGraph = {
      components: new Map(),
      sortedOrder: [],
      cycles: []
    };
    this.generatedFiles = new Map();
  }

  /**
   * Main entry point: Generate code with dependency awareness
   */
  async generateCodeWithDependencies(codePlan: any): Promise<{
    success: boolean;
    generatedFiles: GeneratedFile[];
    errors: string[];
  }> {
    console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Starting dependency-aware code generation`);
    
    try {
      // Step 1: Analyze dependencies and create graph
      await this.analyzeDependencies(codePlan);
      
      // Step 2: Perform topological sort
      this.performTopologicalSort();
      
      // Step 3: Generate files in dependency order
      const result = await this.generateFilesInOrder();
      
      console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Generated ${result.generatedFiles.length} files`);
      return result;
      
    } catch (error: any) {
      console.error(`[DependencyAwareGenerator] Job ${this.jobId}: Error in dependency-aware generation:`, error);
      return {
        success: false,
        generatedFiles: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Step 1: Analyze component dependencies from CodePlan
   */
  private async analyzeDependencies(codePlan: any): Promise<void> {
    console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Analyzing dependencies...`);
    
    // Initialize components from file structure
    if (codePlan.fileStructure?.frontend) {
      for (const file of codePlan.fileStructure.frontend) {
        this.addComponentToGraph(file, 'frontend');
      }
    }
    
    if (codePlan.fileStructure?.backend) {
      for (const file of codePlan.fileStructure.backend) {
        this.addComponentToGraph(file, 'backend');
      }
    }
    
    // Add components from component analysis
    if (codePlan.frontendComponents) {
      for (const comp of codePlan.frontendComponents) {
        this.addComponentFromAnalysis(comp, 'frontend');
      }
    }
    
    if (codePlan.backendComponents) {
      for (const comp of codePlan.backendComponents) {
        this.addComponentFromAnalysis(comp, 'backend');
      }
    }
    
    // Build dependency relationships
    this.buildDependencyRelationships(codePlan);
    
    console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Dependency analysis complete - ${this.dependencyGraph.components.size} components`);
  }

  /**
   * Add a file-based component to the dependency graph
   */
  private addComponentToGraph(file: any, type: 'frontend' | 'backend'): void {
    const componentName = this.extractComponentName(file.path);
    const category = this.extractCategory(file.path);
    
    const component: ComponentDependency = {
      name: componentName,
      type,
      category,
      dependencies: file.dependencies || [],
      dependents: [],
      complexity: this.calculateComplexity(file.content),
      generationOrder: -1,
      filePath: file.path,
      content: file.content
    };
    
    this.dependencyGraph.components.set(componentName, component);
  }

  /**
   * Add a component from analysis to the dependency graph
   */
  private addComponentFromAnalysis(comp: any, type: 'frontend' | 'backend'): void {
    const componentName = comp.name;
    const category = comp.category || 'components';
    
    const component: ComponentDependency = {
      name: componentName,
      type,
      category,
      dependencies: comp.dependencies || [],
      dependents: [],
      complexity: comp.complexity || 1,
      generationOrder: -1,
      filePath: this.generateFilePath(componentName, type, category),
      content: comp.content
    };
    
    this.dependencyGraph.components.set(componentName, component);
  }

  /**
   * Build dependency relationships between components
   */
  private buildDependencyRelationships(codePlan: any): void {
    // Process explicit dependencies from CodePlan
    if (codePlan.frontendDependencies) {
      for (const dep of codePlan.frontendDependencies) {
        this.addDependency(dep.from, dep.to, dep.type);
      }
    }
    
    if (codePlan.backendDependencies) {
      for (const dep of codePlan.backendDependencies) {
        this.addDependency(dep.from, dep.to, dep.type);
      }
    }
    
    // Add implicit dependencies based on imports
    this.addImplicitDependencies();
  }

  /**
   * Add explicit dependency relationship
   */
  private addDependency(from: string, to: string, type: string): void {
    const fromComp = this.dependencyGraph.components.get(from);
    const toComp = this.dependencyGraph.components.get(to);
    
    if (fromComp && toComp) {
      if (!fromComp.dependencies.includes(to)) {
        fromComp.dependencies.push(to);
      }
      if (!toComp.dependents.includes(from)) {
        toComp.dependents.push(from);
      }
    }
  }

  /**
   * Add implicit dependencies based on import statements
   */
  private addImplicitDependencies(): void {
    for (const [name, component] of this.dependencyGraph.components) {
      if (component.content) {
        const imports = this.extractImports(component.content);
        for (const importName of imports) {
          this.addDependency(name, importName, 'imports');
        }
      }
    }
  }

  /**
   * Step 2: Perform topological sort to determine generation order
   */
  private performTopologicalSort(): void {
    console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Performing topological sort...`);
    
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: string[] = [];
    const cycles: string[][] = [];
    
    const visit = (nodeName: string, path: string[] = []): boolean => {
      if (tempVisited.has(nodeName)) {
        // Circular dependency detected
        const cycle = [...path, nodeName];
        cycles.push(cycle);
        console.warn(`[DependencyAwareGenerator] Circular dependency detected: ${cycle.join(' -> ')}`);
        return false;
      }
      
      if (visited.has(nodeName)) {
        return true;
      }
      
      tempVisited.add(nodeName);
      
      const component = this.dependencyGraph.components.get(nodeName);
      if (component) {
        for (const dep of component.dependencies) {
          if (!visit(dep, [...path, nodeName])) {
            return false;
          }
        }
      }
      
      tempVisited.delete(nodeName);
      visited.add(nodeName);
      sorted.push(nodeName);
      
      return true;
    };
    
    // Visit all components
    for (const [name] of this.dependencyGraph.components) {
      if (!visited.has(name)) {
        visit(name);
      }
    }
    
    // Assign generation order
    sorted.forEach((name, index) => {
      const component = this.dependencyGraph.components.get(name);
      if (component) {
        component.generationOrder = index;
      }
    });
    
    this.dependencyGraph.sortedOrder = sorted;
    this.dependencyGraph.cycles = cycles;
    
    console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Topological sort complete - ${sorted.length} components, ${cycles.length} cycles`);
  }

  /**
   * Step 3: Generate files in dependency order
   */
  private async generateFilesInOrder(): Promise<{
    success: boolean;
    generatedFiles: GeneratedFile[];
    errors: string[];
  }> {
    console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Generating files in dependency order...`);
    
    const generatedFiles: GeneratedFile[] = [];
    const errors: string[] = [];
    
    // Sort components by generation order
    const sortedComponents = Array.from(this.dependencyGraph.components.values())
      .sort((a, b) => a.generationOrder - b.generationOrder);
    
    for (const component of sortedComponents) {
      try {
        console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Generating ${component.name} (order: ${component.generationOrder})`);
        
        // Get dependency context
        const dependencyContext = this.buildDependencyContext(component);
        
        // Generate or enhance component content
        const generatedFile = await this.generateComponentWithContext(component, dependencyContext);
        
        if (generatedFile) {
          generatedFiles.push(generatedFile);
          this.generatedFiles.set(component.name, generatedFile);
          
          // Write file to disk
          await this.writeFileToDisk(generatedFile);
          
          console.log(`[DependencyAwareGenerator] Job ${this.jobId}: Generated ${generatedFile.path}`);
        }
        
      } catch (error: any) {
        const errorMsg = `Error generating ${component.name}: ${error.message}`;
        console.error(`[DependencyAwareGenerator] Job ${this.jobId}: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    return {
      success: errors.length === 0,
      generatedFiles,
      errors
    };
  }

  /**
   * Build dependency context for a component
   */
  private buildDependencyContext(component: ComponentDependency): string {
    const dependencies: string[] = [];
    
    for (const depName of component.dependencies) {
      const depComponent = this.dependencyGraph.components.get(depName);
      const generatedFile = this.generatedFiles.get(depName);
      
      if (depComponent && generatedFile) {
        dependencies.push(`// Dependency: ${depName} (${depComponent.type}/${depComponent.category})
${generatedFile.content}
`);
      }
    }
    
    return dependencies.join('\n\n');
  }

  /**
   * Generate component with dependency context
   */
  private async generateComponentWithContext(
    component: ComponentDependency, 
    dependencyContext: string
  ): Promise<GeneratedFile | null> {
    
    // If component already has content, enhance it with dependency context
    if (component.content) {
      const enhancedContent = await this.enhanceExistingContent(component, dependencyContext);
      return {
        path: component.filePath,
        content: enhancedContent,
        dependencies: component.dependencies,
        description: `Enhanced ${component.category} component`,
        category: component.category
      };
    }
    
    // Generate new component content
    const newContent = await this.generateNewComponent(component, dependencyContext);
    return {
      path: component.filePath,
      content: newContent,
      dependencies: component.dependencies,
      description: `Generated ${component.category} component`,
      category: component.category
    };
  }

  /**
   * Enhance existing component content with proper imports
   */
  private async enhanceExistingContent(component: ComponentDependency, dependencyContext: string): Promise<string> {
    const componentContent = component.content || '';
    const prompt = `You are an expert software developer. Enhance the following component code by adding proper imports and fixing any dependency issues.

**COMPONENT TO ENHANCE:**
${componentContent}

**AVAILABLE DEPENDENCIES:**
${dependencyContext}

**REQUIREMENTS:**
1. Add proper import statements for all dependencies
2. Fix any import path issues
3. Ensure TypeScript types are properly imported
4. Maintain the existing functionality
5. Follow best practices for the component type (${component.type}/${component.category})

**RESPONSE FORMAT:**
Return only the enhanced code with proper imports and fixes applied.

**CRITICAL:**
- Keep all existing functionality intact
- Only add/fix imports and dependency references
- Ensure the code compiles without errors
- Use proper relative import paths`;

    try {
      const response = await this.makeAIRequest(prompt);
      return response || componentContent;
    } catch (error) {
      console.warn(`[DependencyAwareGenerator] Failed to enhance ${component.name}, using original content`);
      return componentContent;
    }
  }

  /**
   * Generate new component content
   */
  private async generateNewComponent(component: ComponentDependency, dependencyContext: string): Promise<string> {
    const prompt = `You are an expert software developer. Generate a complete, functional ${component.type} ${component.category} component.

**COMPONENT DETAILS:**
- Name: ${component.name}
- Type: ${component.type}
- Category: ${component.category}
- Dependencies: ${component.dependencies.join(', ')}

**AVAILABLE DEPENDENCIES:**
${dependencyContext}

**CRITICAL REQUIREMENTS:**
1. Generate ONLY functional, production-ready code
2. NO explanations, comments, or markdown formatting
3. NO commented-out code or placeholder content
4. NO "TODO" or "FIXME" comments
5. Include proper imports for all dependencies
6. Use TypeScript with proper typing
7. Follow best practices for ${component.type} development
8. Include error handling and validation
9. Make it immediately usable and functional

**FOR FRONTEND COMPONENTS:**
- Use React functional components with hooks
- Import React: import React from 'react'
- Use proper TypeScript interfaces for props
- Export as default: export default ComponentName
- Include proper error boundaries and loading states
- Use modern React patterns (hooks, functional components)

**FOR BACKEND COMPONENTS:**
- Use proper TypeScript classes or functions
- Include proper error handling and validation
- Use async/await patterns where appropriate
- Include proper exports and imports
- Follow Node.js/Express best practices

**RESPONSE FORMAT:**
Return ONLY the complete, functional component code. Start with the first import statement and end with the last export statement.

**CRITICAL:**
- NO markdown formatting
- NO code fences (\`\`\`)
- NO explanatory text before or after the code
- NO commented-out code sections
- NO placeholder content
- Generate immediately functional code that compiles and works

Generate the complete ${component.name} component now:`;

    try {
      const response = await this.makeAIRequest(prompt);
      if (response && !response.includes('### Explanation:') && !response.includes('// TODO:')) {
        return response;
      } else {
        // Fallback to a basic functional component if AI generates poor content
        return this.generateFallbackComponent(component);
      }
    } catch (error) {
      console.warn(`[DependencyAwareGenerator] Failed to generate ${component.name}, using fallback`);
      return this.generateFallbackComponent(component);
    }
  }

  /**
   * Generate a fallback component when AI generation fails
   */
  private generateFallbackComponent(component: ComponentDependency): string {
    if (component.type === 'frontend') {
      return `import React from 'react';

interface ${component.name}Props {
  // Add props as needed
}

const ${component.name}: React.FC<${component.name}Props> = (props) => {
  return (
    <div className="${component.name.toLowerCase()}-container">
      <h2>${component.name}</h2>
      <p>${component.name} component loaded successfully.</p>
    </div>
  );
};

export default ${component.name};`;
    } else {
      return `export class ${component.name} {
  constructor() {
    // Initialize component
  }

  async initialize(): Promise<void> {
    // Initialize logic
  }

  async process(): Promise<any> {
    // Main processing logic
    return {};
  }
}

export default ${component.name};`;
    }
  }

  /**
   * Write generated file to disk
   */
  private async writeFileToDisk(file: GeneratedFile): Promise<void> {
    // Log file details before writing
    console.log(`[DependencyAwareGenerator] Preparing to write file: originalPath='${file.path}', type='${(file as any).type}', category='${file.category}'`);
    
    let filePath = file.path;
    let fileType = (file as any).type;
    let fallbackUsed = false;
    
    // Determine file type if not present
    if (!fileType) {
      // Infer from path as fallback
      if (/src[\\\/]components|src[\\\/]pages|src[\\\/]hooks|src[\\\/]types|src[\\\/]store/.test(filePath)) {
        fileType = 'frontend';
        fallbackUsed = true;
      } else if (/src[\\\/]controllers|src[\\\/]models|src[\\\/]services|src[\\\/]routes|src[\\\/]middleware/.test(filePath)) {
        fileType = 'backend';
        fallbackUsed = true;
      } else {
        // Default to backend if unclear
        fileType = 'backend';
        fallbackUsed = true;
      }
    }
    
    // CRITICAL FIX: Always ensure file is under frontend/ or backend/
    // If path doesn't start with frontend/ or backend/, prepend the correct prefix
    if (!filePath.startsWith('frontend/') && !filePath.startsWith('backend/')) {
      if (fileType === 'frontend') {
        filePath = 'frontend/' + filePath.replace(/^\/?/, '');
        console.log(`[DependencyAwareGenerator] Prefixed frontend path: ${file.path} -> ${filePath}`);
      } else if (fileType === 'backend') {
        filePath = 'backend/' + filePath.replace(/^\/?/, '');
        console.log(`[DependencyAwareGenerator] Prefixed backend path: ${file.path} -> ${filePath}`);
      } else {
        // Fallback to backend if type is still unclear
        filePath = 'backend/' + filePath.replace(/^\/?/, '');
        console.warn(`[DependencyAwareGenerator] Ambiguous file type for ${file.path}, defaulting to backend`);
        fallbackUsed = true;
      }
    }
    
    // CRITICAL FIX: Ensure file has proper extension to prevent duplicates
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    // Check if file has no extension and add appropriate one
    if (!fileName.includes('.')) {
      let extension = '.ts'; // Default to .ts
      
      // Determine extension based on file type and content
      if (fileType === 'frontend') {
        // Check if it's a React component (contains JSX)
        if (file.content.includes('React') || file.content.includes('jsx') || file.content.includes('tsx') || 
            file.content.includes('useState') || file.content.includes('useEffect') || file.content.includes('return (')) {
          extension = '.tsx';
        } else {
          extension = '.ts';
        }
      } else if (fileType === 'backend') {
        // Backend files should always be .ts
        extension = '.ts';
      } else {
        // Default to .ts for unknown types
        extension = '.ts';
      }
      
      // Add extension to filename
      const newFileName = fileName + extension;
      filePath = path.join(dirName, newFileName);
      console.log(`[DependencyAwareGenerator] Added extension to file: ${fileName} -> ${newFileName}`);
    }
    
    const fullPath = path.join(this.projectPath, filePath);
    
    if (fallbackUsed) {
      console.warn(`[DependencyAwareGenerator] Fallback type logic used for file: ${file.path} (inferred type: ${fileType})`);
    }
    
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      const sanitizedContent = sanitizeGeneratedCode(file.content);
      await fs.writeFile(fullPath, sanitizedContent, 'utf-8');
      console.log(`[DependencyAwareGenerator] Wrote file: ${fullPath}`);
    } catch (err) {
      console.error(`[DependencyAwareGenerator] Error writing file ${fullPath}:`, err);
    }
  }

  /**
   * Utility methods
   */
  private extractComponentName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  private extractCategory(filePath: string): string {
    const parts = filePath.split('/');
    return parts[1] || 'components';
  }

  private calculateComplexity(content: string): number {
    if (!content) return 1;
    const lines = content.split('\n').length;
    const functions = (content.match(/function|=>/g) || []).length;
    const imports = (content.match(/import/g) || []).length;
    return Math.min(3, Math.max(1, Math.floor((lines + functions + imports) / 20)));
  }

  private generateFilePath(name: string, type: 'frontend' | 'backend', category: string): string {
    const ext = type === 'frontend' ? '.tsx' : '.ts';
    return `${type}/src/${category}/${name}${ext}`;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+)?(\w+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  private async makeAIRequest(prompt: string): Promise<string | null> {
    try {
      // Try OpenAI first
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content;
      if (content) return content;
      
    } catch (openaiError) {
      console.log(`[DependencyAwareGenerator] OpenAI failed, trying Anthropic: ${openaiError}`);
      
      try {
        const response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.3,
        });
        
        const content = response.content[0];
        if (content.type === 'text' && content.text) return content.text;
        
      } catch (anthropicError) {
        console.error(`[DependencyAwareGenerator] Both AI providers failed:`, anthropicError);
      }
    }
    
    return null;
  }
}

export const dependencyAwareCodeGenerator = new DependencyAwareCodeGenerator('', ''); 