import * as fs from 'fs';
import * as path from 'path';
import { AICodeGenerationService } from './aiCodeGenerationService';
import { promisify } from 'util';

export interface ComponentDependency {
  name: string;
  dependencies: string[];
  type: 'component' | 'page' | 'hook' | 'service' | 'util' | 'controller' | 'model' | 'route' | 'middleware';
  priority: number;
}

export interface GenerationResult {
  success: boolean;
  generatedFiles: string[];
  errors: string[];
  warnings: string[];
}

export class DependencyAwareGenerator {
  private aiService: AICodeGenerationService;
  private baseDir: string;

  constructor(baseDir: string = 'generated-projects') {
    this.aiService = new AICodeGenerationService();
    this.baseDir = baseDir;
  }

  /**
   * Generate components in dependency order
   */
  async generateComponentsInOrder(
    projectId: string,
    appAnalysis: any,
    umlDiagrams: any,
    infraCode: string,
    userPrompt: string
  ): Promise<GenerationResult> {
    const result: GenerationResult = {
      success: true,
      generatedFiles: [],
      errors: [],
      warnings: []
    };

    try {
      console.log(`[DependencyAwareGenerator] Starting dependency-aware generation for project: ${projectId}`);
      
      // Step 1: Analyze dependencies and create generation plan
      const generationPlan = this.createGenerationPlan(appAnalysis, umlDiagrams);
      
      // Step 2: Generate components in dependency order
      const projectPath = path.join(this.baseDir, projectId);
      await this.ensureProjectStructure(projectPath);
      
      for (const phase of generationPlan) {
        console.log(`[DependencyAwareGenerator] Generating phase: ${phase.name}`);
        
        for (const component of phase.components) {
          try {
            await this.generateComponent(component, projectPath, appAnalysis, umlDiagrams, infraCode, userPrompt, result);
          } catch (error: any) {
            console.error(`[DependencyAwareGenerator] Error generating ${component.name}:`, error.message);
            result.errors.push(`Failed to generate ${component.name}: ${error.message}`);
          }
        }
      }

      // Step 3: Validate generated components
      await this.validateGeneratedComponents(projectPath, result);

    } catch (error: any) {
      console.error(`[DependencyAwareGenerator] Generation failed:`, error.message);
      result.success = false;
      result.errors.push(`Generation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Create generation plan based on dependencies
   */
  private createGenerationPlan(appAnalysis: any, umlDiagrams: any): Array<{name: string, components: ComponentDependency[]}> {
    const plan: Array<{name: string, components: ComponentDependency[]}> = [];

    // Phase 1: Core utilities and types (no dependencies)
    plan.push({
      name: 'Core Utilities',
      components: [
        { name: 'types', type: 'util', dependencies: [], priority: 1 },
        { name: 'constants', type: 'util', dependencies: [], priority: 1 },
        { name: 'utils', type: 'util', dependencies: [], priority: 1 }
      ]
    });

    // Phase 2: Backend models and utilities (depend on types)
    plan.push({
      name: 'Backend Models',
      components: [
        { name: 'UserModel', type: 'model', dependencies: ['types'], priority: 2 },
        { name: 'ProjectModel', type: 'model', dependencies: ['types'], priority: 2 },
        { name: 'TaskModel', type: 'model', dependencies: ['types'], priority: 2 }
      ]
    });

    // Phase 3: Backend services (depend on models)
    plan.push({
      name: 'Backend Services',
      components: [
        { name: 'UserService', type: 'service', dependencies: ['UserModel'], priority: 3 },
        { name: 'ProjectService', type: 'service', dependencies: ['ProjectModel'], priority: 3 },
        { name: 'TaskService', type: 'service', dependencies: ['TaskModel'], priority: 3 }
      ]
    });

    // Phase 4: Backend controllers (depend on services)
    plan.push({
      name: 'Backend Controllers',
      components: [
        { name: 'UserController', type: 'controller', dependencies: ['UserService'], priority: 4 },
        { name: 'ProjectController', type: 'controller', dependencies: ['ProjectService'], priority: 4 },
        { name: 'TaskController', type: 'controller', dependencies: ['TaskService'], priority: 4 }
      ]
    });

    // Phase 5: Backend routes (depend on controllers)
    plan.push({
      name: 'Backend Routes',
      components: [
        { name: 'UserRoutes', type: 'route', dependencies: ['UserController'], priority: 5 },
        { name: 'ProjectRoutes', type: 'route', dependencies: ['ProjectController'], priority: 5 },
        { name: 'TaskRoutes', type: 'route', dependencies: ['TaskController'], priority: 5 }
      ]
    });

    // Phase 6: Backend middleware (depend on types)
    plan.push({
      name: 'Backend Middleware',
      components: [
        { name: 'AuthMiddleware', type: 'middleware', dependencies: ['types'], priority: 6 },
        { name: 'ValidationMiddleware', type: 'middleware', dependencies: ['types'], priority: 6 },
        { name: 'ErrorMiddleware', type: 'middleware', dependencies: ['types'], priority: 6 }
      ]
    });

    // Phase 7: Frontend services and hooks (depend on types)
    plan.push({
      name: 'Frontend Services',
      components: [
        { name: 'apiService', type: 'service', dependencies: ['types'], priority: 7 },
        { name: 'useApi', type: 'hook', dependencies: ['types'], priority: 7 },
        { name: 'useAuth', type: 'hook', dependencies: ['types'], priority: 7 }
      ]
    });

    // Phase 8: Frontend basic components (depend on services/hooks)
    plan.push({
      name: 'Frontend Basic Components',
      components: [
        { name: 'Button', type: 'component', dependencies: ['types'], priority: 8 },
        { name: 'Input', type: 'component', dependencies: ['types'], priority: 8 },
        { name: 'Loading', type: 'component', dependencies: ['types'], priority: 8 }
      ]
    });

    // Phase 9: Frontend feature components (depend on basic components)
    plan.push({
      name: 'Frontend Feature Components',
      components: [
        { name: 'AuthForm', type: 'component', dependencies: ['Button', 'Input', 'useAuth'], priority: 9 },
        { name: 'DataList', type: 'component', dependencies: ['Loading', 'useApi'], priority: 9 },
        { name: 'DataForm', type: 'component', dependencies: ['Button', 'Input', 'useApi'], priority: 9 }
      ]
    });

    // Phase 10: Frontend pages (depend on feature components)
    plan.push({
      name: 'Frontend Pages',
      components: [
        { name: 'HomePage', type: 'page', dependencies: ['DataList'], priority: 10 },
        { name: 'LoginPage', type: 'page', dependencies: ['AuthForm'], priority: 10 },
        { name: 'DetailPage', type: 'page', dependencies: ['DataForm'], priority: 10 }
      ]
    });

    return plan;
  }

  /**
   * Generate a single component using focused AI call
   */
  private async generateComponent(
    component: ComponentDependency,
    projectPath: string,
    appAnalysis: any,
    umlDiagrams: any,
    infraCode: string,
    userPrompt: string,
    result: GenerationResult
  ): Promise<void> {
    console.log(`[DependencyAwareGenerator] Generating ${component.name} (${component.type})`);

    // Read existing components for context
    const existingComponents = await this.readExistingComponents(projectPath);
    
    // Create focused prompt for this specific component
    const prompt = this.createFocusedPrompt(component, existingComponents, appAnalysis, umlDiagrams, infraCode, userPrompt);
    
    try {
      // Generate component using AI - use a simple approach
      const response = await this.aiService['makeAIRequest'](prompt);
      const cleanedResponse = this.aiService['cleanJsonResponse'](response);
      const componentData = JSON.parse(cleanedResponse);
      
      // Extract component code
      const componentCode = componentData.componentCode || componentData.code || response;
      
      // Write component to appropriate directory
      const componentPath = await this.writeComponent(component, componentCode, projectPath);
      
      result.generatedFiles.push(componentPath);
      console.log(`[DependencyAwareGenerator] ✅ Generated ${component.name}`);
      
    } catch (error: any) {
      console.error(`[DependencyAwareGenerator] Error generating ${component.name}:`, error.message);
      result.errors.push(`Failed to generate ${component.name}: ${error.message}`);
    }
  }

  /**
   * Create focused prompt for specific component
   */
  private createFocusedPrompt(
    component: ComponentDependency,
    existingComponents: Record<string, string>,
    appAnalysis: any,
    umlDiagrams: any,
    infraCode: string,
    userPrompt: string
  ): string {
    const existingComponentsStr = Object.entries(existingComponents)
      .map(([name, code]) => `// ${name}\n${code}`)
      .join('\n\n');

    return `Generate a ${component.type} named "${component.name}" for a web application.

App Context:
- Analysis: ${JSON.stringify(appAnalysis, null, 2)}
- UML Diagrams: ${JSON.stringify(umlDiagrams, null, 2)}
- Infrastructure: ${infraCode}
- User Request: ${userPrompt}

Existing Components:
${existingComponentsStr}

Dependencies: ${component.dependencies.join(', ')}

Requirements:
1. Generate a complete, functional ${component.type}
2. Use proper TypeScript interfaces and types
3. Follow React best practices
4. Include proper error handling
5. Make it production-ready
6. Ensure all imports are resolved

Generate ONLY the component code in this JSON format:
{
  "componentCode": "// Complete ${component.type} code here"
}

Return ONLY valid JSON. No explanations or additional text.`;
  }

  /**
   * Write component to appropriate directory
   */
  private async writeComponent(
    component: ComponentDependency,
    componentCode: string,
    projectPath: string
  ): Promise<string> {
    let componentPath: string;
    let fileName: string;

    switch (component.type) {
      // Frontend components
      case 'component':
        fileName = `${component.name}.tsx`;
        componentPath = path.join(projectPath, 'frontend', 'src', 'components', fileName);
        break;
      case 'page':
        fileName = `${component.name}.tsx`;
        componentPath = path.join(projectPath, 'frontend', 'src', 'pages', fileName);
        break;
      case 'hook':
        fileName = `use${component.name.charAt(0).toUpperCase() + component.name.slice(1)}.ts`;
        componentPath = path.join(projectPath, 'frontend', 'src', 'hooks', fileName);
        break;
      case 'service':
        fileName = `${component.name}.ts`;
        componentPath = path.join(projectPath, 'frontend', 'src', 'services', fileName);
        break;
      case 'util':
        fileName = `${component.name}.ts`;
        componentPath = path.join(projectPath, 'frontend', 'src', 'utils', fileName);
        break;
      
      // Backend components
      case 'controller':
        fileName = `${component.name}.ts`;
        componentPath = path.join(projectPath, 'backend', 'src', 'controllers', fileName);
        break;
      case 'model':
        fileName = `${component.name}.ts`;
        componentPath = path.join(projectPath, 'backend', 'src', 'models', fileName);
        break;
      case 'route':
        fileName = `${component.name}.ts`;
        componentPath = path.join(projectPath, 'backend', 'src', 'routes', fileName);
        break;
      case 'middleware':
        fileName = `${component.name}.ts`;
        componentPath = path.join(projectPath, 'backend', 'src', 'middleware', fileName);
        break;
      default:
        throw new Error(`Unknown component type: ${component.type}`);
    }

    // Ensure directory exists
    await this.ensureDirectoryExists(path.dirname(componentPath));
    
    // Write component file
    await promisify(fs.writeFile)(componentPath, componentCode, 'utf-8');
    
    return componentPath;
  }

  /**
   * Read existing components for context
   */
  private async readExistingComponents(projectPath: string): Promise<Record<string, string>> {
    const components: Record<string, string> = {};
    
    const directories = [
      // Frontend directories
      path.join(projectPath, 'frontend', 'src', 'components'),
      path.join(projectPath, 'frontend', 'src', 'pages'),
      path.join(projectPath, 'frontend', 'src', 'hooks'),
      path.join(projectPath, 'frontend', 'src', 'services'),
      path.join(projectPath, 'frontend', 'src', 'utils'),
      
      // Backend directories
      path.join(projectPath, 'backend', 'src', 'controllers'),
      path.join(projectPath, 'backend', 'src', 'models'),
      path.join(projectPath, 'backend', 'src', 'services'),
      path.join(projectPath, 'backend', 'src', 'routes'),
      path.join(projectPath, 'backend', 'src', 'middleware'),
      path.join(projectPath, 'backend', 'src', 'utils')
    ];

    for (const dir of directories) {
      try {
        if (await this.pathExists(dir)) {
          const files = await promisify(fs.readdir)(dir);
          const tsFiles = files.filter((file: string) => file.endsWith('.ts') || file.endsWith('.tsx'));
          
          for (const file of tsFiles) {
            const filePath = path.join(dir, file);
            const content = await promisify(fs.readFile)(filePath, 'utf-8');
            const componentName = file.replace(/\.(ts|tsx)$/, '');
            components[componentName] = content;
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read
      }
    }
    
    return components;
  }

  /**
   * Ensure project structure exists
   */
  private async ensureProjectStructure(projectPath: string): Promise<void> {
    const directories = [
      path.join(projectPath, 'frontend', 'src', 'components'),
      path.join(projectPath, 'frontend', 'src', 'pages'),
      path.join(projectPath, 'frontend', 'src', 'hooks'),
      path.join(projectPath, 'frontend', 'src', 'services'),
      path.join(projectPath, 'frontend', 'src', 'utils'),
      path.join(projectPath, 'backend', 'src', 'controllers'),
      path.join(projectPath, 'backend', 'src', 'models'),
      path.join(projectPath, 'backend', 'src', 'services'),
      path.join(projectPath, 'backend', 'src', 'routes'),
      path.join(projectPath, 'backend', 'src', 'middleware'),
      path.join(projectPath, 'backend', 'src', 'utils')
    ];

    for (const dir of directories) {
      await this.ensureDirectoryExists(dir);
    }
  }

  /**
   * Validate generated components
   */
  private async validateGeneratedComponents(projectPath: string, result: GenerationResult): Promise<void> {
    console.log(`[DependencyAwareGenerator] Validating generated components`);

    try {
      const frontendPath = path.join(projectPath, 'frontend');
      
      if (await this.pathExists(frontendPath)) {
        // Check for TypeScript compilation
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        try {
          const { stderr } = await execAsync(`npx tsc --noEmit`, {
            cwd: frontendPath,
            timeout: 30000
          });

          if (stderr && stderr.trim()) {
            result.warnings.push(`TypeScript compilation warnings: ${stderr}`);
          } else {
            console.log(`[DependencyAwareGenerator] ✅ TypeScript compilation passed`);
          }
        } catch (error: any) {
          result.errors.push(`TypeScript compilation failed: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.warnings.push(`Validation error: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await promisify(fs.access)(dirPath);
    } catch {
      await promisify(fs.mkdir)(dirPath, { recursive: true });
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await promisify(fs.access)(path);
      return true;
    } catch {
      return false;
    }
  }
}

export default DependencyAwareGenerator; 