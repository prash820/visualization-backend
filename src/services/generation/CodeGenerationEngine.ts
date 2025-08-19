import { 
  TaskPlan, 
  UMLIntermediateRepresentation, 
  GlobalSymbolTable,
  CodeGeneratorContext,
  BaseCodeGenerator,
  ModelGenerator,
  ServiceGenerator,
  ControllerGenerator,
  FrontendComponentGenerator
} from '../codeGenerationEngine';

export class CodeGenerationEngine {
  private generators: Map<string, BaseCodeGenerator>;

  constructor() {
    this.generators = new Map();
  }

  async generateCode(
    taskPlan: TaskPlan, 
    representation: UMLIntermediateRepresentation, 
    symbolTable: GlobalSymbolTable
  ): Promise<Array<{ path: string; content: string }>> {
    const generatedFiles: Array<{ path: string; content: string }> = [];
    
    console.log('[CodeGenerationEngine] Starting code generation...');
    console.log('[CodeGenerationEngine] Task plan generation order:', taskPlan.generationOrder);
    
    const context: CodeGeneratorContext = {
      representation,
      taskPlan,
      projectPath: '', // Will be set by orchestrator
      semanticIndex: new Map(),
      infrastructureContext: representation.infrastructureContext,
      symbolTable,
      globalSymbolTableManager: undefined
    };

    // Initialize generators
    this.initializeGenerators(context);

    // Generate code in topological order
    for (const taskId of taskPlan.generationOrder) {
      const task = this.findTaskById(taskId, taskPlan);
      if (!task) {
        console.warn(`[CodeGenerationEngine] Task not found: ${taskId}`);
        continue;
      }

      const generator = this.getGeneratorForTask(task);
      if (!generator) {
        console.warn(`[CodeGenerationEngine] No generator found for task type: ${task.type}`);
        continue;
      }

      try {
        console.log(`[CodeGenerationEngine] Generating code for task: ${taskId} (${task.type})`);
        const code = await generator.generate(task);
        
        if (code && code.trim()) {
          const filePath = this.getFilePathForTask(task);
          generatedFiles.push({ path: filePath, content: code });
          console.log(`[CodeGenerationEngine] Generated: ${filePath}`);
        }

        // Update generated files for topological context
        generator.updateGeneratedFiles(generatedFiles);
        
      } catch (error: any) {
        console.error(`[CodeGenerationEngine] Error generating code for task ${taskId}:`, error);
      }
    }

    console.log(`[CodeGenerationEngine] Code generation completed. Generated ${generatedFiles.length} files.`);
    return generatedFiles;
  }

  private initializeGenerators(context: CodeGeneratorContext): void {
    this.generators.set('model', new ModelGenerator(context));
    this.generators.set('service', new ServiceGenerator(context));
    this.generators.set('controller', new ControllerGenerator(context));
    this.generators.set('component', new FrontendComponentGenerator(context));
    this.generators.set('page', new FrontendComponentGenerator(context));
  }

  private findTaskById(taskId: string, taskPlan: TaskPlan): any {
    const allTasks = [
      ...taskPlan.backendTasks,
      ...taskPlan.frontendTasks,
      ...taskPlan.commonTasks,
      ...taskPlan.testTasks,
      ...taskPlan.buildTasks,
      ...taskPlan.deploymentTasks
    ];
    return allTasks.find(task => task.id === taskId);
  }

  private getGeneratorForTask(task: any): BaseCodeGenerator | null {
    return this.generators.get(task.type) || null;
  }

  private getFilePathForTask(task: any): string {
    // Simplified file path generation
    if (task.type === 'model') {
      return task.entityName ? `backend/src/models/${task.entityName}.ts` : `backend/src/models/${task.type}.ts`;
    }
    if (task.type === 'service') {
      const serviceName = task.componentName || 'Service';
      const fileName = serviceName.endsWith('Service') ? serviceName : `${serviceName}Service`;
      return `backend/src/services/${fileName}.ts`;
    }
    if (task.type === 'controller') {
      const controllerName = task.componentName || 'Controller';
      const fileName = controllerName.endsWith('Controller') ? controllerName : `${controllerName}Controller`;
      return `backend/src/controllers/${fileName}.ts`;
    }
    if (task.type === 'component' || task.type === 'page') {
      return task.componentName ? `frontend/src/${task.type}s/${task.componentName}.tsx` : `frontend/src/${task.type}s/${task.type}.tsx`;
    }
    return `backend/src/${task.type}s/${task.type}.ts`;
  }
} 