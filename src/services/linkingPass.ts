import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { SymbolTable, SymbolRecord } from './symbolTable';
import { ImportResolver } from './importResolver';
import { collectUsedSymbols } from './usedSymbols';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

export interface LinkingResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  fixedFiles: string[];
  addedImports: Record<string, string[]>;
  reconciledSignatures: Record<string, string[]>;
}

export class LinkingPass {
  private project: Project;
  private symbolTable: SymbolTable;
  private importResolver: ImportResolver;

  constructor(projectPath: string, symbolTable: SymbolTable) {
    this.project = new Project({
      tsConfigFilePath: path.join(projectPath, 'tsconfig.json')
    });
    this.symbolTable = symbolTable;
    this.importResolver = new ImportResolver(this.project, symbolTable);
  }

  /**
   * Pass A: Generate & Register
   * Generate files from IR and register them in symbol table
   */
  async generateAndRegister(
    irData: any,
    projectPath: string,
    templateEngine: any,
    aiService: any
  ): Promise<{ generatedFiles: string[]; errors: string[] }> {
    const generatedFiles: string[] = [];
    const errors: string[] = [];

    try {
      // Generate models first
      if (irData.backend?.models) {
        for (const modelIR of irData.backend.models) {
          try {
            const filePath = path.join(projectPath, 'backend', 'src', 'models', `${modelIR.name}.ts`);
            const content = await templateEngine.generateCompleteFile('model', modelIR, projectPath, aiService, irData);
            
            await this.writeFile(filePath, content);
            await this.registerSymbol(filePath, 'model', modelIR.name, content);
            generatedFiles.push(filePath);
            
            console.log(`[LinkingPass] ✅ Generated and registered model: ${modelIR.name}`);
          } catch (error: any) {
            errors.push(`Failed to generate model ${modelIR.name}: ${error.message}`);
          }
        }
      }

      // Generate DTOs
      if (irData.backend?.dtos) {
        for (const dtoIR of irData.backend.dtos) {
          try {
            const filePath = path.join(projectPath, 'backend', 'src', 'dto', `${dtoIR.name}.ts`);
            const content = await templateEngine.generateCompleteFile('dto', dtoIR, projectPath, aiService, irData);
            
            await this.writeFile(filePath, content);
            await this.registerSymbol(filePath, 'dto', dtoIR.name, content);
            generatedFiles.push(filePath);
            
            console.log(`[LinkingPass] ✅ Generated and registered DTO: ${dtoIR.name}`);
          } catch (error: any) {
            errors.push(`Failed to generate DTO ${dtoIR.name}: ${error.message}`);
          }
        }
      }

      // Generate services
      if (irData.backend?.services) {
        for (const serviceIR of irData.backend.services) {
          try {
            const filePath = path.join(projectPath, 'backend', 'src', 'services', `${serviceIR.className}.ts`);
            const content = await templateEngine.generateCompleteFile('service', serviceIR, projectPath, aiService, irData);
            
            await this.writeFile(filePath, content);
            await this.registerSymbol(filePath, 'service', serviceIR.className, content);
            generatedFiles.push(filePath);
            
            console.log(`[LinkingPass] ✅ Generated and registered service: ${serviceIR.className}`);
          } catch (error: any) {
            errors.push(`Failed to generate service ${serviceIR.className}: ${error.message}`);
          }
        }
      }

      // Generate controllers
      if (irData.backend?.controllers) {
        for (const controllerIR of irData.backend.controllers) {
          try {
            const filePath = path.join(projectPath, 'backend', 'src', 'controllers', `${controllerIR.name}.ts`);
            const content = await templateEngine.generateCompleteFile('controller', controllerIR, projectPath, aiService, irData);
            
            await this.writeFile(filePath, content);
            await this.registerSymbol(filePath, 'controller', controllerIR.name, content);
            generatedFiles.push(filePath);
            
            console.log(`[LinkingPass] ✅ Generated and registered controller: ${controllerIR.name}`);
          } catch (error: any) {
            errors.push(`Failed to generate controller ${controllerIR.name}: ${error.message}`);
          }
        }
      }

    } catch (error: any) {
      errors.push(`Pass A failed: ${error.message}`);
    }

    return { generatedFiles, errors };
  }

  /**
   * Pass B: Link & Fix Imports
   * Resolve imports and reconcile signatures
   */
  async linkAndFixImports(generatedFiles: string[]): Promise<LinkingResult> {
    const result: LinkingResult = {
      success: true,
      errors: [],
      warnings: [],
      fixedFiles: [],
      addedImports: {},
      reconciledSignatures: {}
    };

    try {
      // Add generated files to project
      generatedFiles.forEach(filePath => {
        this.project.addSourceFileAtPath(filePath);
      });

      // Process each file
      for (const filePath of generatedFiles) {
        try {
          console.log(`[LinkingPass] 🔗 Processing file: ${path.basename(filePath)}`);
          
          // Collect used symbols
          const usage = collectUsedSymbols(this.project, filePath);
          const usedSymbols = usage.symbols.map(s => s.name);
          
          // Ensure imports
          await this.importResolver.ensureImports(filePath, usedSymbols);
          
          // Reconcile controller signatures
          if (filePath.includes('/controllers/')) {
            await this.reconcileControllerSignatures(filePath);
          }
          
          // Clean up unused imports
          await this.importResolver.cleanupUnusedImports(filePath);
          
          // Organize imports
          await this.importResolver.organizeImports(filePath);
          
          result.fixedFiles.push(filePath);
          console.log(`[LinkingPass] ✅ Fixed imports for: ${path.basename(filePath)}`);
          
        } catch (error: any) {
          result.errors.push(`Failed to process ${filePath}: ${error.message}`);
          result.success = false;
        }
      }

      // Validate symbol table
      const validation = this.symbolTable.validate();
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      // Check for circular dependencies
      if (this.symbolTable.hasCircularDependencies()) {
        result.errors.push('Circular dependencies detected in symbol table');
        result.success = false;
      }

    } catch (error: any) {
      result.errors.push(`Pass B failed: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Register a symbol in the symbol table
   */
  private async registerSymbol(
    filePath: string,
    kind: SymbolRecord['kind'],
    name: string,
    content: string
  ): Promise<void> {
    try {
      // Parse the file to extract exports and methods
      const sourceFile = this.project.createSourceFile(filePath, content);
      
      const exports: string[] = [];
      const methods: Record<string, { params: { name: string; tsType: string }[]; returns: string }> = {};
      
      // Extract exports
      sourceFile.getExportDeclarations().forEach(exportDecl => {
        exportDecl.getNamedExports().forEach(namedExport => {
          exports.push(namedExport.getName());
        });
      });
      
      // Extract default export
      const defaultExport = sourceFile.getDefaultExportSymbol();
      if (defaultExport) {
        exports.push(defaultExport.getName());
      }
      
      // Extract methods from classes
      sourceFile.getClasses().forEach(classDecl => {
        classDecl.getMethods().forEach(method => {
          const methodName = method.getName();
          const params = method.getParameters().map(param => ({
            name: param.getName(),
            tsType: param.getType().getText()
          }));
          const returns = method.getReturnType().getText();
          
          methods[methodName] = { params, returns };
        });
      });
      
      // Create symbol record
      const symbolRecord: SymbolRecord = {
        kind,
        name,
        filePath,
        exports,
        methods: Object.keys(methods).length > 0 ? methods : undefined,
        description: `Generated ${kind} for ${name}`
      };
      
      this.symbolTable.addSymbol(symbolRecord);
      
    } catch (error: any) {
      console.warn(`[LinkingPass] Could not register symbol for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write file to disk
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await promisify(fs.mkdir)(dir, { recursive: true });
    await promisify(fs.writeFile)(filePath, content, 'utf-8');
  }

  /**
   * Reconcile controller signatures with service methods
   */
  private async reconcileControllerSignatures(controllerFilePath: string): Promise<void> {
    try {
      const sourceFile = this.project.getSourceFileOrThrow(controllerFilePath);
      const controllerName = path.basename(controllerFilePath, '.ts');
      
      // Find the service this controller depends on
      const serviceDependency = this.findServiceDependency(sourceFile);
      if (!serviceDependency) {
        console.warn(`[LinkingPass] No service dependency found for controller: ${controllerName}`);
        return;
      }
      
      const serviceSymbol = this.symbolTable.get(serviceDependency);
      if (!serviceSymbol) {
        console.warn(`[LinkingPass] Service symbol not found: ${serviceDependency}`);
        return;
      }
      
      // Reconcile method calls
      sourceFile.getClasses().forEach(classDecl => {
        classDecl.getMethods().forEach(method => {
          const methodName = method.getName();
          const serviceMethod = serviceSymbol.methods?.[methodName];
          
          if (serviceMethod) {
            // Update method signature to match service
            this.updateMethodSignature(method, serviceMethod);
          }
        });
      });
      
      await sourceFile.save();
      
    } catch (error: any) {
      console.warn(`[LinkingPass] Could not reconcile controller signatures: ${error.message}`);
    }
  }

  /**
   * Find service dependency in controller
   */
  private findServiceDependency(sourceFile: SourceFile): string | null {
    try {
      const classDecl = sourceFile.getClasses()[0];
      if (!classDecl) return null;
      
      const constructor = classDecl.getConstructors()[0];
      if (!constructor) return null;
      
      const params = constructor.getParameters();
      for (const param of params) {
        const type = param.getType();
        const typeText = type.getText();
        
        // Look for service types
        if (typeText.includes('Service')) {
          return typeText.replace(/^.*?(\w+Service).*$/, '$1');
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Update method signature to match service method
   */
  private updateMethodSignature(method: any, serviceMethod: any): void {
    try {
      // Update parameter types
      const params = method.getParameters();
      const serviceParams = serviceMethod.params;
      
      params.forEach((param: any, index: number) => {
        if (serviceParams[index]) {
          const expectedType = serviceParams[index].tsType;
          const currentType = param.getType().getText();
          
          if (currentType !== expectedType) {
            // Update parameter type
            param.setType(expectedType);
          }
        }
      });
      
      // Update return type
      const expectedReturn = serviceMethod.returns;
      const currentReturn = method.getReturnType().getText();
      
      if (currentReturn !== expectedReturn) {
        method.setReturnType(expectedReturn);
      }
      
    } catch (error: any) {
      console.warn(`[LinkingPass] Could not update method signature: ${error.message}`);
    }
  }

  /**
   * Run complete two-pass generation
   */
  async runTwoPassGeneration(
    irData: any,
    projectPath: string,
    templateEngine: any,
    aiService: any
  ): Promise<LinkingResult> {
    console.log('[LinkingPass] 🚀 Starting two-pass generation');
    
    // Pass A: Generate & Register
    console.log('[LinkingPass] 📝 Pass A: Generate & Register');
    const { generatedFiles, errors: passAErrors } = await this.generateAndRegister(
      irData,
      projectPath,
      templateEngine,
      aiService
    );
    
    if (passAErrors.length > 0) {
      console.warn('[LinkingPass] ⚠️ Pass A had errors:', passAErrors);
    }
    
    // Pass B: Link & Fix Imports
    console.log('[LinkingPass] 🔗 Pass B: Link & Fix Imports');
    const linkingResult = await this.linkAndFixImports(generatedFiles);
    
    // Combine results
    const result: LinkingResult = {
      success: linkingResult.success && passAErrors.length === 0,
      errors: [...passAErrors, ...linkingResult.errors],
      warnings: linkingResult.warnings,
      fixedFiles: linkingResult.fixedFiles,
      addedImports: linkingResult.addedImports,
      reconciledSignatures: linkingResult.reconciledSignatures
    };
    
    console.log(`[LinkingPass] ✅ Two-pass generation completed`);
    console.log(`[LinkingPass] 📊 Results: ${result.fixedFiles.length} files processed, ${result.errors.length} errors, ${result.warnings.length} warnings`);
    
    return result;
  }

  /**
   * Save symbol table to file
   */
  async saveSymbolTable(filePath: string): Promise<void> {
    await this.symbolTable.saveToFile(filePath);
  }

  /**
   * Load symbol table from file
   */
  async loadSymbolTable(filePath: string): Promise<void> {
    await this.symbolTable.loadFromFile(filePath);
  }
}

export default LinkingPass; 