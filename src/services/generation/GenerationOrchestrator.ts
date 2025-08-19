import {
  UMLIntermediateRepresentation,
  TaskPlan,
  GlobalSymbolTable
} from '../codeGenerationEngine';
import { InfrastructureContext } from '../../types/infrastructure';
import { InputProcessor } from './InputProcessor';
import { SymbolTableManager } from './SymbolTableManager';
import { TaskPlannerAgent } from '../codeGenerationEngine';
import { CodeGenerationEngine } from './CodeGenerationEngine';
import { StructureComposer, BuildValidatorAndFixerAgent, Deployer } from '../codeGenerationEngine';
import { CleanupManager } from './CleanupManager';
import { TaskPlanStorage } from './TaskPlanStorage';
import { EnterpriseAppGenerator, EnterpriseAppConfig, EnterpriseAppArchitecture } from './EnterpriseAppGenerator';

export interface GenerationResult {
  success: boolean;
  deploymentUrl?: string;
  errors: string[];
  warnings?: string[];
  generatedFiles?: Array<{ path: string; content: string }>;
  taskPlan?: TaskPlan;
}

export class GenerationOrchestrator {
  private inputProcessor: InputProcessor;
  private symbolTableManager: SymbolTableManager;
  private taskPlanner: TaskPlannerAgent;
  private codeGenerator: CodeGenerationEngine;
  private structureComposer: StructureComposer;
  private validator: BuildValidatorAndFixerAgent;
  private deployer: Deployer;
  private cleanupManager: CleanupManager;
  private taskPlanStorage: TaskPlanStorage;
  private enterpriseAppGenerator?: EnterpriseAppGenerator;

  constructor(projectPath: string, infrastructureContext: InfrastructureContext) {
    this.inputProcessor = new InputProcessor();
    this.symbolTableManager = new SymbolTableManager();
    this.taskPlanner = new TaskPlannerAgent();
    this.codeGenerator = new CodeGenerationEngine();
    this.structureComposer = new StructureComposer(projectPath);
    this.validator = new BuildValidatorAndFixerAgent(projectPath);
    this.deployer = new Deployer(projectPath, infrastructureContext);
    this.cleanupManager = new CleanupManager(projectPath);
    this.taskPlanStorage = new TaskPlanStorage(projectPath);
  }

  async generateApplication(umlDiagrams: any): Promise<GenerationResult> {
    console.log('[GenerationOrchestrator] Starting application generation');

    try {
      // Phase 0: Cleanup
      await this.cleanupManager.performCleanup();

      // Phase 1: Input Processing
      const representation = await this.inputProcessor.processInputs(umlDiagrams, this.deployer.getInfrastructureContext());

      // Phase 2: Symbol Table Management
      const symbolTable = await this.symbolTableManager.initializeSymbolTable(representation);

      // Phase 3: Task Planning
      const taskPlan = await this.taskPlanner.createTaskPlan(representation);
      await this.taskPlanStorage.saveTaskPlan(taskPlan, representation);

      // Phase 4: Enterprise App Generation (NEW)
      const enterpriseResult = await this.generateEnterpriseApp(representation, symbolTable);
      if (enterpriseResult.success) {
        console.log('[GenerationOrchestrator] Enterprise app generation successful');
        return {
          success: true,
          deploymentUrl: enterpriseResult.deploymentUrl,
          errors: enterpriseResult.errors,
          generatedFiles: enterpriseResult.generatedFiles,
          taskPlan
        };
      }

      // Phase 5: Fallback to Legacy Code Generation
      console.log('[GenerationOrchestrator] Falling back to legacy code generation');
      const generatedFiles = await this.codeGenerator.generateCode(taskPlan, representation, symbolTable);

      // Phase 6: Structure Composition
      await this.structureComposer.composeStructure(generatedFiles);

      // Phase 7: Validation
      const validationResult = await this.validator.validateAndFix();
      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Phase 8: Deployment
      const deploymentResult = await this.deployer.deploy();

      return {
        success: true,
        deploymentUrl: deploymentResult.deploymentUrl,
        errors: deploymentResult.errors,
        generatedFiles,
        taskPlan
      };

    } catch (error: any) {
      console.error('[GenerationOrchestrator] Error during generation:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  private async generateEnterpriseApp(
    representation: UMLIntermediateRepresentation,
    symbolTable: GlobalSymbolTable
  ): Promise<GenerationResult> {
    try {
      console.log('[GenerationOrchestrator] Starting enterprise app generation');

      // Configure enterprise app settings
      const config: EnterpriseAppConfig = {
        database: 'postgresql',
        authentication: 'jwt',
        apiStyle: 'rest',
        deployment: 'aws-lambda',
        monitoring: 'cloudwatch',
        testing: 'jest',
        validation: 'joi'
      };

      const architecture: EnterpriseAppArchitecture = {
        layers: {
          presentation: 'express',
          business: 'use-cases',
          data: 'repositories',
          infrastructure: 'database'
        },
        patterns: {
          architecture: 'clean',
          api: 'rest',
          database: 'repository'
        }
      };

      // Create enterprise app generator
      this.enterpriseAppGenerator = new EnterpriseAppGenerator(
        representation,
        symbolTable,
        config,
        architecture
      );

      // Generate enterprise app
      const result = await this.enterpriseAppGenerator.generateEnterpriseApp();

      if (result.success) {
        // Compose structure with enterprise files
        await this.structureComposer.composeStructure(result.files);

        // Validate enterprise app
        const validationResult = await this.validator.validateAndFix();
        if (!validationResult.success) {
          return {
            success: false,
            errors: validationResult.errors
          };
        }

        // Deploy enterprise app
        const deploymentResult = await this.deployer.deploy();

        return {
          success: true,
          deploymentUrl: deploymentResult.deploymentUrl,
          errors: result.errors,
          generatedFiles: result.files,
          warnings: result.warnings
        };
      } else {
        return {
          success: false,
          errors: result.errors
        };
      }

    } catch (error: any) {
      console.error('[GenerationOrchestrator] Enterprise app generation failed:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
} 