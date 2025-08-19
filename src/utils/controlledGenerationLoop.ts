// src/utils/controlledGenerationLoop.ts
import { InfrastructureContext } from '../types/infrastructure';
import SemanticIndexManager from './semanticIndex';
import { FunctionSignatureContract } from './functionSignatureGenerator';
import { integrateInfrastructureIntoCode } from './infrastructureIntegration';
import { generateBuildFiles } from './buildFileGenerator';
import * as fs from 'fs/promises';
import * as path from 'path';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Run a shell command in a specific directory
 */
async function runCommand(command: string, cwd: string): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    console.log(`[ControlledGenerationLoop] Running command: ${command} in ${cwd}`);
    const { stdout, stderr } = await execAsync(command, { cwd });
    
    if (stderr) {
      console.warn(`[ControlledGenerationLoop] Command stderr: ${stderr}`);
    }
    
    return {
      success: true,
      output: stdout,
      error: stderr || undefined
    };
  } catch (error: any) {
    console.error(`[ControlledGenerationLoop] Command failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean AI responses that contain markdown code blocks and explanatory text
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
  
  // Remove explanatory text after code ends
  const codeEndPatterns = [
    /(\})\s*$/,
    /(\];\s*)$/,
    /(;\s*)$/
  ];
  
  for (const pattern of codeEndPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(0, match.index! + match[0].length);
      break;
    }
  }
  
  // Remove lines that are clearly explanations (not code)
  const lines = cleaned.split('\n');
  const codeLines = lines.filter(line => {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) return true;
    
    // Skip lines that are clearly explanations
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return true;
    
    // Skip lines that are just text explanations
    if (!trimmed.match(/^(import|export|class|interface|type|enum|const|let|var|function|if|for|while|switch|try|catch|finally|return|throw|break|continue|public|private|protected|static|async|await|=>|{|}|\(|\)|\[|\]|;|,|:|<|>|\+|-|\*|\/|=|!|&|\||\?|\.|\$|_|\w)/)) {
      return false;
    }
    
    return true;
  });
  
  cleaned = codeLines.join('\n');
  
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
 * Generation Context Interface
 * Contains all context needed for code generation
 */
export interface GenerationContext {
  contracts: FunctionSignatureContract;
  semanticIndex: SemanticIndexManager;
  infrastructureContext: any;
  semanticContext: string;
  projectPath: string;
  jobId: string;
}

/**
 * Generation Result Interface
 * Represents the result of generating a single component
 */
export interface GenerationResult {
  componentName: string;
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route';
  filePath: string;
  content: string;
  dependencies: string[];
  generatedAt: string;
  status: 'success' | 'error';
  error?: string;
  infrastructureConfig?: any;
  deploymentConfig?: any;
  environmentVariables?: any;
}

/**
 * Generation Plan Interface
 * Defines the order and dependencies for code generation
 */
export interface GenerationPlan {
  order: Array<{
    componentName: string;
    componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route';
    dependencies: string[];
    priority: number;
  }>;
  totalComponents: number;
  estimatedTime: number; // in seconds
}

/**
 * Controlled Generation Loop Interface
 * Manages the entire code generation process
 */
export interface ControlledGenerationLoop {
  context: GenerationContext;
  plan: GenerationPlan;
  results: GenerationResult[];
  status: 'planning' | 'generating' | 'completed' | 'error';
  progress: number; // 0-100
}

/**
 * Generate code using controlled generation loop
 */
export async function generateCodeWithControlledLoop(
  contracts: FunctionSignatureContract,
  semanticIndex: SemanticIndexManager,
  infrastructureContext: any,
  semanticContext: string,
  projectPath: string,
  jobId: string
): Promise<ControlledGenerationLoop> {
  console.log('[ControlledGenerationLoop] Starting controlled code generation...');
  
  try {
    // Create generation context
    const context: GenerationContext = {
      contracts,
      semanticIndex,
      infrastructureContext,
      semanticContext,
      projectPath,
      jobId
    };
    
    // Create generation plan with topological sorting
    const plan = await createGenerationPlan(context);
    
    // Initialize generation loop
    const generationLoop: ControlledGenerationLoop = {
      context,
      plan,
      results: [],
      status: 'planning',
      progress: 0
    };
    
    console.log(`[ControlledGenerationLoop] Plan created: ${plan.totalComponents} components in ${plan.order.length} steps`);
    
    // Execute generation loop
    await executeGenerationLoop(generationLoop);
    
    console.log('[ControlledGenerationLoop] ✅ Code generation completed successfully');
    console.log(`[ControlledGenerationLoop] Generated ${generationLoop.results.length} components`);
    
    return generationLoop;
    
  } catch (error: any) {
    console.error('[ControlledGenerationLoop] ❌ Error in controlled generation loop:', error);
    throw new Error(`Failed to generate code: ${error.message}`);
  }
}

/**
 * Create generation plan with topological sorting
 */
async function createGenerationPlan(context: GenerationContext): Promise<GenerationPlan> {
  console.log('[ControlledGenerationLoop] Creating generation plan with topological sorting...');
  
  const { contracts } = context;
  const components: Array<{
    componentName: string;
    componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route';
    dependencies: string[];
    priority: number;
  }> = [];
  
  // Add entities (highest priority - no dependencies)
  for (const [entityName] of Object.entries(contracts.entities)) {
    components.push({
      componentName: entityName,
      componentType: 'entity',
      dependencies: [],
      priority: 1
    });
  }
  
  // Add repositories (depend on entities)
  for (const [repositoryName, repositoryContract] of Object.entries(contracts.repositories)) {
    components.push({
      componentName: repositoryName,
      componentType: 'repository',
      dependencies: [repositoryContract.implementation.entity],
      priority: 2
    });
  }
  
  // Add services (depend on repositories)
  for (const [serviceName, serviceContract] of Object.entries(contracts.services)) {
    const dependencies = serviceContract.implementation.methods
      .flatMap(method => method.dependencies)
      .filter((dep, index, arr) => arr.indexOf(dep) === index); // Remove duplicates
    
    components.push({
      componentName: serviceName,
      componentType: 'service',
      dependencies,
      priority: 3
    });
  }
  
  // Add controllers (depend on services)
  for (const [controllerName, controllerContract] of Object.entries(contracts.controllers)) {
    const dependencies = controllerContract.implementation.dependencies
      .map(dep => dep.split(':')[0].trim()); // Extract service name from dependency
    
    components.push({
      componentName: controllerName,
      componentType: 'controller',
      dependencies,
      priority: 4
    });
  }
  
  // Add routes (depend on controllers)
  if (contracts.api && contracts.api.routes) {
    for (const route of contracts.api.routes) {
      components.push({
        componentName: `${route.controller}Routes`,
        componentType: 'route',
        dependencies: [route.controller],
        priority: 5
      });
    }
  }
  
  // Sort components by priority and dependencies
  const sortedOrder = topologicalSort(components);
  
  const estimatedTime = sortedOrder.length * 30; // 30 seconds per component
  
  return {
    order: sortedOrder,
    totalComponents: sortedOrder.length,
    estimatedTime
  };
}

/**
 * Topological sort for dependency resolution
 */
function topologicalSort(components: Array<{
  componentName: string;
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route';
  dependencies: string[];
  priority: number;
}>): Array<{
  componentName: string;
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route';
  dependencies: string[];
  priority: number;
}> {
  // Create adjacency list
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize graph and in-degree
  for (const component of components) {
    graph.set(component.componentName, []);
    inDegree.set(component.componentName, 0);
  }
  
  // Build graph
  for (const component of components) {
    for (const dependency of component.dependencies) {
      const dependencyComponent = components.find(c => c.componentName === dependency);
      if (dependencyComponent) {
        graph.get(dependency)!.push(component.componentName);
        inDegree.set(component.componentName, inDegree.get(component.componentName)! + 1);
      }
    }
  }
  
  // Kahn's algorithm for topological sorting
  const queue: string[] = [];
  const result: typeof components = [];
  
  // Add components with no dependencies
  for (const [componentName, degree] of inDegree) {
    if (degree === 0) {
      queue.push(componentName);
    }
  }
  
  while (queue.length > 0) {
    // Sort queue by priority to ensure consistent order
    queue.sort((a, b) => {
      const compA = components.find(c => c.componentName === a)!;
      const compB = components.find(c => c.componentName === b)!;
      return compA.priority - compB.priority;
    });
    
    const current = queue.shift()!;
    const component = components.find(c => c.componentName === current)!;
    result.push(component);
    
    // Update in-degree for dependent components
    for (const dependent of graph.get(current) || []) {
      const newDegree = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, newDegree);
      
      if (newDegree === 0) {
        queue.push(dependent);
      }
    }
  }
  
  // Check for circular dependencies
  if (result.length !== components.length) {
    const remaining = components.filter(c => !result.some(r => r.componentName === c.componentName));
    console.warn('[ControlledGenerationLoop] Warning: Circular dependencies detected in:', remaining.map(c => c.componentName));
  }
  
  return result;
}

/**
 * Execute the generation loop
 */
async function executeGenerationLoop(generationLoop: ControlledGenerationLoop): Promise<void> {
  const { context, plan } = generationLoop;
  
  generationLoop.status = 'generating';
  
  // Track generated files for semantic context
  const generatedFiles = new Map<string, string>();
  
  // Generate components one by one in dependency order
  console.log(`[ControlledGenerationLoop] Starting sequential generation of ${plan.order.length} components...`);
  
  for (let i = 0; i < plan.order.length; i++) {
    const component = plan.order[i];
    console.log(`[ControlledGenerationLoop] Generating ${i + 1}/${plan.order.length}: ${component.componentType} - ${component.componentName}`);
    
    try {
      // Get semantic context from already generated files
      const fileContext = await getFileContextForComponent(component, generatedFiles, context.semanticIndex, context.contracts, plan);
      
      // Generate component code
      const result = await generateComponentCode(
        component.componentName,
        component.componentType,
        context.contracts,
        context.infrastructureContext,
        context.semanticContext,
        context.projectPath,
        context.jobId,
        fileContext
      );
      
      // Write file to disk immediately
      if (result.status === 'success') {
        const fullPath = path.join(context.projectPath, result.filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, result.content, 'utf-8');
        console.log(`[ControlledGenerationLoop] ✅ Generated: ${result.filePath}`);
        
        // Add to generated files for context
        generatedFiles.set(result.filePath, result.content);
        
        // Update semantic index with the new file
        await updateSemanticIndex(context.semanticIndex, result);
      } else {
        console.error(`[ControlledGenerationLoop] ❌ Failed to generate ${component.componentName}: ${result.error}`);
      }
      
      // Add result to generation loop
      generationLoop.results.push(result);
      
      // Update progress
      const completed = i + 1;
      generationLoop.progress = Math.round((completed / plan.totalComponents) * 100);
      
      console.log(`[ControlledGenerationLoop] Progress: ${completed}/${plan.totalComponents} (${generationLoop.progress}%)`);
      
    } catch (error: any) {
      console.error(`[ControlledGenerationLoop] ❌ Error generating ${component.componentName}:`, error);
      
      const errorResult = {
        componentName: component.componentName,
        componentType: component.componentType,
        filePath: '',
        content: '',
        dependencies: component.dependencies,
        generatedAt: new Date().toISOString(),
        status: 'error' as const,
        error: error.message
      };
      
      generationLoop.results.push(errorResult);
    }
  }
  
  console.log(`[ControlledGenerationLoop] ✅ Sequential generation completed: ${generationLoop.results.filter(r => r.status === 'success').length}/${plan.totalComponents} components generated successfully`);
  
  // === Generate Build Files ===
  console.log(`[ControlledGenerationLoop] Generating build files for complete project...`);
  try {
    const buildFilesResult = await generateBuildFiles(
      context.projectPath,
      context.infrastructureContext,
      'app-backend'
    );
    
    if (buildFilesResult.success) {
      // Write build files to disk
      for (const buildFile of buildFilesResult.files) {
        const fullPath = path.join(context.projectPath, buildFile.path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, buildFile.content, 'utf-8');
        console.log(`[ControlledGenerationLoop] Generated build file: ${buildFile.path}`);
      }
      console.log(`[ControlledGenerationLoop] Generated ${buildFilesResult.files.length} build files successfully`);
    } else {
      console.error(`[ControlledGenerationLoop] Failed to generate build files: ${buildFilesResult.error}`);
    }
  } catch (buildError: any) {
    console.error(`[ControlledGenerationLoop] Error during build file generation: ${buildError.message}`);
  }
  
  // === Generate Main Index File ===
  console.log(`[ControlledGenerationLoop] Generating main index.ts entry point...`);
  try {
    const indexContent = await generateIndexFile(
      context.contracts,
      context.infrastructureContext,
      context.semanticContext
    );
    
    const indexPath = path.join(context.projectPath, 'backend', 'src', 'index.ts');
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, indexContent, 'utf-8');
    console.log(`[ControlledGenerationLoop] Generated main index.ts successfully at ${indexPath}`);
  } catch (indexError: any) {
    console.error(`[ControlledGenerationLoop] Error generating main index.ts: ${indexError.message}`);
  }
  
  // === Install Dependencies and Build ===
  console.log(`[ControlledGenerationLoop] Installing dependencies and building project...`);
  try {
    const backendPath = path.join(context.projectPath, 'backend');
    
    // Install dependencies
    console.log(`[ControlledGenerationLoop] Installing npm dependencies...`);
    const installResult = await runCommand('npm install', backendPath);
    if (installResult.success) {
      console.log(`[ControlledGenerationLoop] ✅ Dependencies installed successfully`);
    } else {
      console.error(`[ControlledGenerationLoop] ❌ Failed to install dependencies: ${installResult.error}`);
    }
    
    // Run build
    console.log(`[ControlledGenerationLoop] Running npm build...`);
    const buildResult = await runCommand('npm run build', backendPath);
    if (buildResult.success) {
      console.log(`[ControlledGenerationLoop] ✅ Build completed successfully`);
    } else {
      console.error(`[ControlledGenerationLoop] ❌ Build failed: ${buildResult.error}`);
    }
    
  } catch (buildError: any) {
    console.error(`[ControlledGenerationLoop] Error during build process: ${buildError.message}`);
  }
  
  generationLoop.status = 'completed';
}

/**
 * Get file context for component generation
 */
async function getFileContextForComponent(
  component: {
    componentName: string;
    componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route';
    dependencies: string[];
  },
  generatedFiles: Map<string, string>,
  semanticIndex: SemanticIndexManager,
  contracts: FunctionSignatureContract,
  plan: GenerationPlan
): Promise<string> {
  const contextParts: string[] = [];
  
  // Add comprehensive project context
  contextParts.push(`// === PROJECT CONTEXT ===`);
  contextParts.push(`// Component: ${component.componentName} (${component.componentType})`);
  contextParts.push(`// Dependencies: ${component.dependencies.join(', ')}`);
  contextParts.push(`// Total Components in Plan: ${plan.totalComponents}`);
  contextParts.push(`// Generation Order: ${plan.order.map(c => `${c.componentType}:${c.componentName}`).join(' → ')}`);
  
  // Add contract data for this component
  const componentContract = getComponentContract(component.componentName, component.componentType, contracts);
  if (componentContract) {
    contextParts.push(`// === COMPONENT CONTRACT ===`);
    contextParts.push(`// Contract Data: ${JSON.stringify(componentContract, null, 2)}`);
  }
  
  // Add context from generated dependency files
  contextParts.push(`// === GENERATED DEPENDENCIES ===`);
  for (const dependency of component.dependencies) {
    const dependencyFile = findDependencyFile(dependency, generatedFiles);
    if (dependencyFile) {
      contextParts.push(`// Dependency: ${dependency}`);
      contextParts.push(dependencyFile);
      contextParts.push(``);
    }
  }
  
  // Add all previously generated files for context
  contextParts.push(`// === ALL GENERATED FILES ===`);
  for (const [filePath, content] of generatedFiles.entries()) {
    contextParts.push(`// File: ${filePath}`);
    contextParts.push(content);
    contextParts.push(``);
  }
  
  // Add semantic context from existing codebase
  try {
    const semanticContext = await semanticIndex.queryContext({
      currentFile: `${component.componentType}s/${component.componentName}.ts`,
      query: `Generate ${component.componentType} code for ${component.componentName}`,
      contextWindow: 5000,
      maxResults: 20,
      semanticSimilarity: true,
      includeFunctions: true,
      includeClasses: true,
      includeTypes: true
    });
    
    if (semanticContext.context) {
      contextParts.push(`// === SEMANTIC CONTEXT ===`);
      contextParts.push(semanticContext.context);
    }
  } catch (error) {
    console.warn(`[ControlledGenerationLoop] Could not get semantic context for ${component.componentName}:`, error);
  }
  
  return contextParts.join('\n');
}

/**
 * Find dependency file in generated files
 */
function findDependencyFile(dependencyName: string, generatedFiles: Map<string, string>): string | null {
  for (const [filePath, content] of generatedFiles) {
    if (filePath.includes(dependencyName)) {
      return content;
    }
  }
  return null;
}

/**
 * Generate code for a specific component with infrastructure integration
 */
async function generateComponentCode(
  componentName: string,
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route',
  contracts: FunctionSignatureContract,
  infrastructureContext: InfrastructureContext,
  semanticContext: string,
  projectPath: string,
  jobId: string,
  fileContext: string
): Promise<GenerationResult> {
  try {
    console.log(`[ControlledGenerationLoop] Generating ${componentType}: ${componentName}`);
    
    // Get component-specific contract
    const contract = getComponentContract(componentName, componentType, contracts);
    if (!contract) {
      throw new Error(`No contract found for ${componentType}: ${componentName}`);
    }
    
    // Generate base code using AI
    const baseCode = await generateBaseCode(componentName, componentType, contract, semanticContext, fileContext);
    
    // === PHASE 4: INFRASTRUCTURE INTEGRATION ===
    // DISABLED: Infrastructure integration adds config blocks and infrastructure code to individual files
    // We want to keep individual files clean and have infrastructure config only in index.ts
    console.log(`[ControlledGenerationLoop] Skipping infrastructure integration for ${componentName} (config moved to index.ts)`);
    
    // For now, use the base code directly without infrastructure integration
    const integratedCode = baseCode;
    
    // Update semantic index with the integrated code
    // Note: The semantic index will be updated when the file is written to disk
    // For now, we'll skip the immediate update to avoid method issues
    
    return {
      componentName,
      componentType,
      filePath: `backend/src/${componentType === 'entity' ? 'models' : componentType === 'repository' ? 'repositories' : componentType === 'service' ? 'services' : componentType === 'route' ? 'routes' : 'controllers'}/${componentName}.ts`,
      content: integratedCode,
      status: 'success',
      dependencies: extractDependencies(integratedCode),
      generatedAt: new Date().toISOString(),
      infrastructureConfig: undefined, // Infrastructure config is now in index.ts
      deploymentConfig: undefined,
      environmentVariables: undefined
    };
    
  } catch (error: any) {
    console.error(`[ControlledGenerationLoop] Error generating ${componentType} ${componentName}:`, error);
    return {
      componentName,
      componentType,
      filePath: `backend/src/${componentType === 'entity' ? 'models' : componentType === 'repository' ? 'repositories' : componentType === 'service' ? 'services' : componentType === 'route' ? 'routes' : 'controllers'}/${componentName}.ts`,
      content: '',
      status: 'error',
      error: error.message,
      dependencies: [],
      generatedAt: new Date().toISOString()
    };
  }
}

/**
 * Get component contract from function signature contracts
 */
function getComponentContract(
  componentName: string,
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route',
  contracts: FunctionSignatureContract
): any {
  switch (componentType) {
    case 'entity':
      return contracts.entities[componentName];
    case 'repository':
      return contracts.repositories[componentName];
    case 'service':
      return contracts.services[componentName];
    case 'controller':
      return contracts.controllers[componentName];
    case 'route':
      // For routes, we need to find the corresponding API route configuration
      if (contracts.api && contracts.api.routes) {
        const routeConfig = contracts.api.routes.find(route => 
          `${route.controller}Routes` === componentName
        );
        return routeConfig;
      }
      return null;
    default:
      throw new Error(`Unknown component type: ${componentType}`);
  }
}

/**
 * Get semantic context for a specific component
 */
async function getComponentSemanticContext(
  component: { componentName: string; componentType: string },
  semanticIndex: SemanticIndexManager
): Promise<string> {
  try {
    const query = {
      query: `Find code related to ${component.componentName} ${component.componentType}`,
      maxResults: 5,
      fileTypes: ['ts', 'js'],
      contextWindow: 1000
    };
    
    const context = await semanticIndex.queryContext(query);
    return context.context; // Use the context string directly
  } catch (error) {
    console.warn(`[ControlledGenerationLoop] Warning: Could not get semantic context for ${component.componentName}:`, error);
    return '';
  }
}

/**
 * Generate file path for component
 */
function generateFilePath(
  component: { componentName: string; componentType: string },
  projectPath: string
): string {
  const basePath = `backend/src`;
  
  switch (component.componentType) {
    case 'entity':
      return `${basePath}/models/${component.componentName}.ts`;
    case 'repository':
      return `${basePath}/repositories/${component.componentName}.ts`;
    case 'service':
      return `${basePath}/services/${component.componentName}.ts`;
    case 'controller':
      return `${basePath}/controllers/${component.componentName}.ts`;
    default:
      throw new Error(`Unknown component type: ${component.componentType}`);
  }
}

/**
 * Generate base code using AI
 */
async function generateBaseCode(
  componentName: string,
  componentType: 'entity' | 'service' | 'controller' | 'repository' | 'route',
  contract: any,
  projectSemanticContext: string,
  fileContext: string
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate a complete, functional ${componentType} implementation for ${componentName}.

**CONTRACT DATA (USE THIS EXACTLY - DO NOT MAKE UP TYPES):**
${contract.createInput || ''}
${contract.updateInput || ''}
${contract.implementation ? JSON.stringify(contract.implementation, null, 2) : ''}
${componentType === 'route' ? JSON.stringify(contract, null, 2) : ''}
${contract.properties ? `Properties: ${JSON.stringify(contract.properties, null, 2)}` : ''}

**FILE CONTEXT (Dependencies and Related Code):**
${fileContext}

**PROJECT SEMANTIC CONTEXT:**
${projectSemanticContext}

**CRITICAL REQUIREMENTS:**
1. **GENERATE ONLY CODE** - NO explanations, NO markdown formatting, NO code fences
2. **USE CONTRACT DATA EXACTLY** - Use ONLY the types and structures provided in the contract above
3. **NO MADE-UP TYPES** - Do NOT create types like "NoteUpdateInput" unless they are in the contract
4. **COMPLETE IMPLEMENTATION** - Include all methods, properties, and logic from the contract
5. **PROPER TYPESCRIPT** - Use proper types, interfaces, and TypeScript features
6. **FOLLOW PATTERNS** - Match existing codebase patterns from semantic context
7. **FUNCTIONAL CODE** - Generate immediately usable, compilable code
8. **NO PLACEHOLDERS** - No TODO comments or placeholder content
9. **PROPER EXPORTS** - Export classes with 'export class ClassName' syntax
10. **ERROR HANDLING** - Include proper error handling and validation
11. **JSDOC COMMENTS** - Include JSDoc comments for documentation
12. **LAMBDA COMPATIBLE** - Ensure code works with AWS Lambda deployment
13. **NO CONFIG BLOCKS** - Do NOT include any environment configuration blocks, const config = {...}, or process.env usage
14. **NO INTERFACES** - Do NOT import or use any interfaces (I*Service, I*Controller, I*Repository)
15. **CORRECT IMPORTS** - Use proper relative import paths:
    - For models: import from '../models/ModelName'
    - For services: import from '../services/ServiceName'
    - For repositories: import from '../repositories/RepositoryName'
    - For config: import { config } from '../config'
    - For AWS SDK: import from '@aws-sdk/client-*'
    - For Express: import from 'express'
    - For serverless: import from 'serverless-http'

**IMPORT PATHS:**
- Models: '../models/'
- Services: '../services/'
- Repositories: '../repositories/'
- Configuration: '../config'

**NAMING CONVENTIONS:**
- Class names: ComponentName (e.g., NotesController)
- File names: ComponentName.ts (e.g., NotesController.ts)
- Import names: Match the exported name exactly (NOT duplicated names like NotesRepositoryRepository)
- NO INTERFACE NAMES: Do NOT use I* prefix (NOT INotesService, use NotesService)

**FOR IMPLEMENTATIONS:**
- Export classes with 'export class ClassName'
- Use proper class names (NOT duplicated names like NotesRepositoryRepository)
- Do NOT include any configuration blocks or environment variable usage
- Import dependencies with correct relative paths
- Implement all methods from the contract EXACTLY as specified
- Use the file context to understand dependencies and patterns
- Do NOT import or reference any interfaces (I*Service, I*Controller, I*Repository)
- Import concrete classes directly (NotesService, not INotesService)
- Use ONLY the types and structures provided in the contract data above

**CONTROLLER GENERATION (for controller type):**
- Export class with 'export class ControllerName'
- Include a public router property: public router = Router();
- Set up all routes in constructor or initialize method
- Use proper dependency injection for services
- Include proper error handling and validation
- Export router for use in main application

**EXAMPLES:**
✅ CORRECT CONTROLLER:
import { Router, Request, Response } from 'express';
import { NotesService } from '../services/NotesService';

export class NotesController {
  public router = Router();
  private notesService: NotesService;

  constructor(notesService: NotesService) {
    this.notesService = notesService;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.getAllNotes.bind(this));
    this.router.get('/:id', this.getNote.bind(this));
    this.router.post('/', this.createNote.bind(this));
    this.router.put('/:id', this.updateNote.bind(this));
    this.router.delete('/:id', this.deleteNote.bind(this));
  }

  async getAllNotes(req: Request, res: Response) {
    try {
      const notes = await this.notesService.getAllNotes();
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get notes' });
    }
  }

  // ... other methods
}

**ENTITY GENERATION (for entity type):**
- Use ONLY the properties defined in the contract.properties array
- Do NOT create additional properties not in the contract
- Use the exact property names and types from the contract
- If contract.createInput exists, use it for constructor parameters
- If contract.updateInput exists, use it for update methods

**CONSTRUCTOR REQUIREMENTS:**
- All dependencies must be injected through constructor
- Use proper dependency injection pattern
- Example: constructor(private notesRepository: NotesRepository) {}

**METHOD NAMING CONSISTENCY:**
- Repository methods: create(), findById(), update(), delete(), findAll(), findByUserId()
- Service methods: createNote(), getNoteById(), updateNote(), deleteNote(), getAllNotes(), getNotesByUserId()
- Controller methods: createNote(), getNote(), updateNote(), deleteNote(), getAllNotes()

**PROPERTY ACCESS:**
- Entity properties must be public (not private) for external access
- Use public properties: public title: string; public content: string;
- Do NOT use private properties that need external access
- Use ONLY the properties defined in the contract data above

**EXAMPLES:**
✅ CORRECT (using contract data):
// If contract.properties = [{name: 'title', type: 'string', required: true}, {name: 'content', type: 'string', required: false}]
export class Note {
  public title: string;
  public content?: string;
  
  constructor(data: { title: string; content?: string }) {
    this.title = data.title;
    this.content = data.content;
  }
}

✅ CORRECT:
import { NotesService } from '../services/NotesService';
export class NotesController {
  constructor(private notesService: NotesService) {}
  
  async createNote(req: Request, res: Response) {
    const result = await this.notesService.createNote(req.body);
    res.json(result);
  }
}

✅ CORRECT ENTITY:
export class Note {
  public id: string;
  public title: string;
  public content: string;
  public userId: string;
  public createdAt: Date;
  public updatedAt: Date;
  
  constructor(data: Partial<Note>) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.content = data.content || '';
    this.userId = data.userId || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}

✅ CORRECT REPOSITORY:
export class NotesRepository {
  async create(note: Note): Promise<Note> {
    // Implementation
  }
  
  async findById(id: string): Promise<Note | null> {
    // Implementation
  }
  
  async update(id: string, data: Partial<Note>): Promise<Note> {
    // Implementation
  }
  
  async delete(id: string): Promise<void> {
    // Implementation
  }
  
  async findAll(): Promise<Note[]> {
    // Implementation
  }
  
  async findByUserId(userId: string): Promise<Note[]> {
    // Implementation
  }
}

✅ CORRECT ROUTE:
import { Router } from 'express';
import { NotesController } from '../controllers/NotesController';

const router = Router();
const notesController = new NotesController(notesService);

router.get('/', notesController.getAllNotes.bind(notesController));
router.get('/:id', notesController.getNote.bind(notesController));
router.post('/', notesController.createNote.bind(notesController));
router.put('/:id', notesController.updateNote.bind(notesController));
router.delete('/:id', notesController.deleteNote.bind(notesController));

export default router;

**ROUTE GENERATION (for route type):**
- Generate Express router with proper route definitions
- Include middleware for validation and authentication
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Include error handling middleware
- Export router for use in main application

❌ WRONG (making up types):
export class Note {
  public update(data: NoteUpdateInput): void { // ❌ NoteUpdateInput not in contract
    // Implementation
  }
}

❌ WRONG:
import { INotesService } from '../services/INotesService';
export class NotesController {
  private notesService: INotesService;
  constructor() {
    this.notesService = new NotesService(); // No dependency injection
  }
}

❌ WRONG ENTITY:
export class Note {
  private title: string; // Private - can't access externally
  private content: string;
}

❌ WRONG METHOD NAMES:
export class NotesRepository {
  async save(note: Note): Promise<Note> {} // Should be create()
  async remove(id: string): Promise<void> {} // Should be delete()
}

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript code. Start with the first import statement and end with the last export statement. NO explanations, NO markdown, NO code fences.

Generate the complete ${componentType} code for ${componentName}:`;

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
 * Extract dependencies from code
 */
function extractDependencies(code: string): string[] {
  const dependencies: string[] = [];
  const importRegex = /import\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    dependencies.push(match[1]);
  }
  return dependencies;
}

/**
 * Update semantic index with new component
 */
async function updateSemanticIndex(semanticIndex: SemanticIndexManager, result: GenerationResult): Promise<void> {
  try {
    // Note: The semantic index will automatically detect file changes through file watchers
    // We don't need to manually parse the file here
    console.log(`[ControlledGenerationLoop] Component ${result.componentName} generated, semantic index will update automatically`);
  } catch (error) {
    console.warn(`[ControlledGenerationLoop] Warning: Could not update semantic index for ${result.componentName}:`, error);
  }
}

/**
 * Generate main index.ts entry point file
 */
async function generateIndexFile(
  contracts: FunctionSignatureContract,
  infrastructureContext: InfrastructureContext,
  semanticContext: string
): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate a complete, functional main entry point file (index.ts) for a Lambda-based backend application.

**AVAILABLE COMPONENTS:**
${Object.keys(contracts.controllers).map(name => `- ${name}Controller`).join('\n')}
${Object.keys(contracts.services).map(name => `- ${name}Service`).join('\n')}
${Object.keys(contracts.repositories).map(name => `- ${name}Repository`).join('\n')}
${Object.keys(contracts.entities).map(name => `- ${name} entity`).join('\n')}

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(infrastructureContext, null, 2)}

**SEMANTIC CONTEXT:**
${semanticContext}

**CRITICAL REQUIREMENTS:**
1. **GENERATE ONLY CODE** - NO explanations, NO markdown formatting, NO code fences
2. **LAMBDA ENTRY POINT** - Create proper Lambda handler with serverless-http
3. **EXPRESS APP SETUP** - Set up Express.js application with middleware
4. **ROUTE REGISTRATION** - Register all controller routes
5. **MIDDLEWARE CONFIGURATION** - Include CORS, body parsing, error handling
6. **CONFIGURATION** - Include inline configuration object with environment variables
7. **ERROR HANDLING** - Include proper error handling and logging
8. **HEALTH CHECK** - Include a basic health check endpoint
9. **PROPER IMPORTS** - Import all necessary dependencies with correct names
10. **LAMBDA COMPATIBLE** - Ensure it works with AWS Lambda deployment
11. **DEPENDENCY INJECTION** - Properly instantiate and inject dependencies
12. **ROUTE SETUP** - Set up routes with proper middleware and error handling

**CONFIGURATION STRUCTURE:**
Include this configuration object at the top of the file:
export const config = {
  database: {
    url: process.env['DATABASE_URL'] || 'postgresql://localhost:5432/notes_app',
    name: process.env['DATABASE_NAME'] || 'notes_app',
    username: process.env['DATABASE_USERNAME'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || 'password',
    port: process.env['DATABASE_PORT'] || '5432',
    type: process.env['DATABASE_TYPE'] || 'postgresql'
  },
  aws: {
    region: process.env['AWS_REGION'] || 'us-east-1',
    apiGatewayUrl: process.env['API_GATEWAY_URL'] || 'https://api.example.com',
    s3BucketName: process.env['S3_BUCKET_NAME'] || 'notes-storage',
    dynamoDbTableName: process.env['DYNAMODB_TABLE_NAME'] || 'notes-table',
    redisEndpoint: process.env['REDIS_ENDPOINT'] || 'redis://localhost:6379'
  },
  application: {
    nodeEnv: process.env['NODE_ENV'] || 'production',
    port: process.env['PORT'] || '3000',
    logLevel: process.env['LOG_LEVEL'] || 'info'
  }
};

**IMPORT NAMING:**
- Import controllers: import { NotesController } from './controllers/NotesController'
- Import services: import { NotesService } from './services/NotesService'
- Import repositories: import { NotesRepository } from './repositories/NotesRepository'
- Import models: import { Note } from './models/Note'
- Use exact class names, not duplicated names

**DEPENDENCY INJECTION PATTERN:**
1. Create repository instances first
2. Create service instances with repository dependencies
3. Create controller instances with service dependencies
4. Set up routes with controller instances

**EXAMPLE STRUCTURE:**
// 1. Create repositories
const notesRepository = new NotesRepository();
const userRepository = new UserRepository();

// 2. Create services with repository dependencies
const notesService = new NotesService(notesRepository);
const userService = new UserService(userRepository);

// 3. Create controllers with service dependencies
const notesController = new NotesController(notesService);
const userController = new UserController(userService);

// 4. Set up routes
app.use('/api/notes', notesController.router);
app.use('/api/users', userController.router);

**ROUTE SETUP:**
- Use controller router instances: app.use('/api/notes', notesController.router)
- Include proper middleware: cors(), helmet(), express.json()
- Add error handling middleware
- Add health check endpoint: app.get('/health', (req, res) => res.json({ status: 'ok' }))

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript code. Start with the first import statement and end with the last export statement. NO explanations, NO markdown, NO code fences.

Generate the complete index.ts entry point:`;

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
 * Generate shared configuration file
 */
async function generateSharedConfig(infrastructureContext: InfrastructureContext): Promise<string> {
  const prompt = `You are an expert TypeScript developer. Generate a complete, functional shared configuration file (config/index.ts) for a Lambda-based backend application.

**INFRASTRUCTURE CONTEXT:**
${JSON.stringify(infrastructureContext, null, 2)}

**CRITICAL REQUIREMENTS:**
1. **GENERATE ONLY CODE** - NO explanations, NO markdown formatting, NO code fences
2. **CONFIGURATION FILE** - Create a TypeScript file that exports a single 'config' object
3. **ENVIRONMENT VARIABLES** - Use process.env for all configuration values
4. **DATABASE CONFIG** - Include database connection configuration
5. **AWS SERVICES** - Include AWS service configurations (S3, DynamoDB, etc.)
6. **APPLICATION CONFIG** - Include application settings (port, log level, etc.)
7. **PROPER TYPES** - Use proper TypeScript types for all config values
8. **DEFAULT VALUES** - Provide sensible default values for all config
9. **SINGLE EXPORT** - Export a single 'config' object with all settings
10. **LAMBDA COMPATIBLE** - Ensure it works with AWS Lambda deployment

**CONFIG STRUCTURE:**
export const config = {
  database: {
    url: process.env['DATABASE_URL'] || 'default_url',
    name: process.env['DATABASE_NAME'] || 'default_name',
    username: process.env['DATABASE_USERNAME'] || 'default_username',
    password: process.env['DATABASE_PASSWORD'] || 'default_password',
    port: process.env['DATABASE_PORT'] || '5432',
    type: process.env['DATABASE_TYPE'] || 'postgresql'
  },
  aws: {
    region: process.env['AWS_REGION'] || 'us-east-1',
    apiGatewayUrl: process.env['API_GATEWAY_URL'] || 'default_url',
    s3BucketName: process.env['S3_BUCKET_NAME'] || 'default_bucket',
    dynamoDbTableName: process.env['DYNAMODB_TABLE_NAME'] || 'default_table',
    redisEndpoint: process.env['REDIS_ENDPOINT'] || 'default_endpoint'
  },
  application: {
    nodeEnv: process.env['NODE_ENV'] || 'production',
    port: process.env['PORT'] || '3000',
    logLevel: process.env['LOG_LEVEL'] || 'info'
  }
};

**RESPONSE FORMAT:**
Return ONLY the complete TypeScript code. Start with the first import statement and end with the last export statement. NO explanations, NO markdown, NO code fences.

Generate the complete config/index.ts:`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.1
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  return cleanAIResponse(rawResponse);
}

/**
 * Get generation progress
 */
export function getGenerationProgress(generationLoop: ControlledGenerationLoop): {
  status: string;
  progress: number;
  completed: number;
  total: number;
  currentComponent?: string;
} {
  const { status, progress, results, plan } = generationLoop;
  
  const completed = results.filter(r => r.status === 'success').length;
  const total = plan.totalComponents;
  
  let currentComponent: string | undefined;
  if (status === 'generating' && completed < total) {
    currentComponent = plan.order[completed]?.componentName;
  }
  
  return {
    status,
    progress,
    completed,
    total,
    currentComponent
  };
}

/**
 * Get generation results summary
 */
export function getGenerationSummary(generationLoop: ControlledGenerationLoop): {
  totalComponents: number;
  successful: number;
  failed: number;
  errors: string[];
  generatedFiles: string[];
} {
  const { results } = generationLoop;
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const errors = results.filter(r => r.status === 'error').map(r => `${r.componentName}: ${r.error}`);
  const generatedFiles = results.filter(r => r.status === 'success').map(r => r.filePath);
  
  return {
    totalComponents: results.length,
    successful,
    failed,
    errors,
    generatedFiles
  };
} 