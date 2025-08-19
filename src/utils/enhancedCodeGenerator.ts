import { ContextAwareCodeGenerator, GenerationContext, CodeSymbol } from './contextAwareCodeGenerator';
import { planMethodSignatures } from './methodSignaturePlanner';
import { generateEnhancedClassDiagram, convertClassDiagramToMethodSignatures } from './enhancedClassDiagramGenerator';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import fs from 'fs';
import path from 'path';

export interface EnhancedCodeGenerationRequest {
  userPrompt: string;
  projectPath?: string;
  currentFile?: string;
  cursorPosition?: number;
  selectedCode?: string;
  errorContext?: {
    type: string;
    message: string;
    line: number;
    column: number;
  };
  mode: 'new' | 'extend' | 'fix' | 'refactor';
}

export interface EnhancedCodeGenerationResult {
  code: string;
  methodSignatures: any;
  filePath: string;
  dependencies: string[];
  imports: string[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  context: {
    symbolsUsed: CodeSymbol[];
    relatedFiles: string[];
    patternsApplied: string[];
  };
}

/**
 * Enhanced Code Generator
 * Combines context-aware generation with method signature planning
 */
export class EnhancedCodeGenerator {
  private contextGenerator: ContextAwareCodeGenerator;
  private projectPath: string;

  constructor(projectPath: string) {
    this.contextGenerator = new ContextAwareCodeGenerator();
    this.projectPath = projectPath;
  }

  /**
   * Initialize the generator with project context
   */
  async initialize(): Promise<void> {
    console.log('[EnhancedCodeGenerator] Initializing with project context...');
    await this.contextGenerator.indexCodebase(this.projectPath);
    console.log('[EnhancedCodeGenerator] Initialization complete');
  }

  /**
   * Generate code with enhanced context awareness
   */
  async generateCode(request: EnhancedCodeGenerationRequest): Promise<EnhancedCodeGenerationResult> {
    console.log(`[EnhancedCodeGenerator] Generating code in ${request.mode} mode...`);

    switch (request.mode) {
      case 'new':
        return await this.generateNewCode(request);
      case 'extend':
        return await this.extendExistingCode(request);
      case 'fix':
        return await this.fixCode(request);
      case 'refactor':
        return await this.refactorCode(request);
      default:
        throw new Error(`Unknown generation mode: ${request.mode}`);
    }
  }

  /**
   * Generate new code with method signature planning
   */
  private async generateNewCode(request: EnhancedCodeGenerationRequest): Promise<EnhancedCodeGenerationResult> {
    // Step 1: Plan method signatures
    console.log('[EnhancedCodeGenerator] Step 1: Planning method signatures...');
    const methodSignatures = await planMethodSignatures(request.userPrompt);
    
    // Step 2: Generate enhanced class diagram
    console.log('[EnhancedCodeGenerator] Step 2: Generating enhanced class diagram...');
    const enhancedClassDiagram = await generateEnhancedClassDiagram(request.userPrompt);
    
    // Step 3: Create generation context
    const context: GenerationContext = {
      userIntent: request.userPrompt,
      projectContext: this.contextGenerator['projectContext'],
      relatedSymbols: [],
      currentFile: request.currentFile,
      cursorPosition: request.cursorPosition,
      selectedCode: request.selectedCode,
      errorContext: request.errorContext
    };

    // Step 4: Find related symbols
    context.relatedSymbols = this.contextGenerator.findRelatedSymbols(context);
    
    // Step 5: Generate code with context
    console.log('[EnhancedCodeGenerator] Step 3: Generating code with context...');
    const generatedCode = await this.contextGenerator.generateCodeWithContext(context);
    
    // Step 6: Determine file path
    const filePath = this.determineFilePath(request, methodSignatures);
    
    // Step 7: Extract dependencies and imports
    const dependencies = this.extractDependencies(generatedCode, context);
    const imports = this.extractImports(generatedCode, context);
    
    // Step 8: Validate code
    const validation = await this.validateGeneratedCode(generatedCode, context);
    
    // Step 9: Build context information
    const contextInfo = {
      symbolsUsed: context.relatedSymbols,
      relatedFiles: this.findRelatedFiles(context),
      patternsApplied: this.extractAppliedPatterns(generatedCode)
    };

    return {
      code: generatedCode,
      methodSignatures,
      filePath,
      dependencies,
      imports,
      validation,
      context: contextInfo
    };
  }

  /**
   * Extend existing code with context awareness
   */
  private async extendExistingCode(request: EnhancedCodeGenerationRequest): Promise<EnhancedCodeGenerationResult> {
    if (!request.currentFile) {
      throw new Error('Current file is required for extend mode');
    }

    // Step 1: Get current file context
    const fileContext = this.contextGenerator.getFileContext(request.currentFile);
    if (!fileContext) {
      throw new Error(`File context not found for: ${request.currentFile}`);
    }

    // Step 2: Create generation context with existing code
    const context: GenerationContext = {
      userIntent: request.userPrompt,
      projectContext: this.contextGenerator['projectContext'],
      relatedSymbols: fileContext.symbols,
      currentFile: request.currentFile,
      cursorPosition: request.cursorPosition,
      selectedCode: request.selectedCode,
      errorContext: request.errorContext
    };

    // Step 3: Generate extension code
    const extensionCode = await this.contextGenerator.generateCodeWithContext(context);
    
    // Step 4: Merge with existing code
    const mergedCode = this.mergeCodeWithExisting(fileContext.content, extensionCode, request.cursorPosition);
    
    // Step 5: Validate merged code
    const validation = await this.validateGeneratedCode(mergedCode, context);
    
    // Step 6: Extract context information
    const contextInfo = {
      symbolsUsed: context.relatedSymbols,
      relatedFiles: this.findRelatedFiles(context),
      patternsApplied: this.extractAppliedPatterns(extensionCode)
    };

    return {
      code: mergedCode,
      methodSignatures: { classes: fileContext.symbols },
      filePath: request.currentFile,
      dependencies: fileContext.dependencies,
      imports: fileContext.imports,
      validation,
      context: contextInfo
    };
  }

  /**
   * Fix code with error context
   */
  private async fixCode(request: EnhancedCodeGenerationRequest): Promise<EnhancedCodeGenerationResult> {
    if (!request.currentFile || !request.errorContext) {
      throw new Error('Current file and error context are required for fix mode');
    }

    // Step 1: Get current file context
    const fileContext = this.contextGenerator.getFileContext(request.currentFile);
    if (!fileContext) {
      throw new Error(`File context not found for: ${request.currentFile}`);
    }

    // Step 2: Create generation context with error information
    const context: GenerationContext = {
      userIntent: `Fix the error: ${request.errorContext.message}`,
      projectContext: this.contextGenerator['projectContext'],
      relatedSymbols: fileContext.symbols,
      currentFile: request.currentFile,
      cursorPosition: request.cursorPosition,
      selectedCode: request.selectedCode,
      errorContext: request.errorContext
    };

    // Step 3: Generate fix
    const fixedCode = await this.contextGenerator.generateCodeWithContext(context);
    
    // Step 4: Apply fix to existing code
    const patchedCode = this.applyFixToCode(fileContext.content, fixedCode, request.errorContext);
    
    // Step 5: Validate fixed code
    const validation = await this.validateGeneratedCode(patchedCode, context);
    
    // Step 6: Extract context information
    const contextInfo = {
      symbolsUsed: context.relatedSymbols,
      relatedFiles: this.findRelatedFiles(context),
      patternsApplied: ['error-fix']
    };

    return {
      code: patchedCode,
      methodSignatures: { classes: fileContext.symbols },
      filePath: request.currentFile,
      dependencies: fileContext.dependencies,
      imports: fileContext.imports,
      validation,
      context: contextInfo
    };
  }

  /**
   * Refactor code with context awareness
   */
  private async refactorCode(request: EnhancedCodeGenerationRequest): Promise<EnhancedCodeGenerationResult> {
    if (!request.currentFile) {
      throw new Error('Current file is required for refactor mode');
    }

    // Step 1: Get current file context
    const fileContext = this.contextGenerator.getFileContext(request.currentFile);
    if (!fileContext) {
      throw new Error(`File context not found for: ${request.currentFile}`);
    }

    // Step 2: Create generation context
    const context: GenerationContext = {
      userIntent: `Refactor: ${request.userPrompt}`,
      projectContext: this.contextGenerator['projectContext'],
      relatedSymbols: fileContext.symbols,
      currentFile: request.currentFile,
      cursorPosition: request.cursorPosition,
      selectedCode: request.selectedCode,
      errorContext: request.errorContext
    };

    // Step 3: Generate refactored code
    const refactoredCode = await this.contextGenerator.generateCodeWithContext(context);
    
    // Step 4: Validate refactored code
    const validation = await this.validateGeneratedCode(refactoredCode, context);
    
    // Step 5: Extract context information
    const contextInfo = {
      symbolsUsed: context.relatedSymbols,
      relatedFiles: this.findRelatedFiles(context),
      patternsApplied: this.extractAppliedPatterns(refactoredCode)
    };

    return {
      code: refactoredCode,
      methodSignatures: { classes: fileContext.symbols },
      filePath: request.currentFile,
      dependencies: fileContext.dependencies,
      imports: fileContext.imports,
      validation,
      context: contextInfo
    };
  }

  /**
   * Determine file path for new code
   */
  private determineFilePath(request: EnhancedCodeGenerationRequest, methodSignatures: any): string {
    // Use method signatures to determine appropriate file path
    if (methodSignatures.classes && methodSignatures.classes.length > 0) {
      const className = methodSignatures.classes[0].name;
      const type = this.determineFileType(className);
      return `src/${type}s/${className}.ts`;
    }
    
    // Fallback to services directory
    return `src/services/GeneratedService.ts`;
  }

  /**
   * Determine file type based on class name
   */
  private determineFileType(className: string): string {
    if (className.includes('Service')) return 'service';
    if (className.includes('Controller')) return 'controller';
    if (className.includes('Repository')) return 'repository';
    if (className.includes('Model')) return 'model';
    if (className.includes('Validator')) return 'validator';
    if (className.includes('Util')) return 'util';
    return 'service';
  }

  /**
   * Extract dependencies from generated code
   */
  private extractDependencies(code: string, context: GenerationContext): string[] {
    const dependencies: string[] = [];
    
    // Extract from imports
    const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const pathMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        if (pathMatch) {
          dependencies.push(pathMatch[1]);
        }
      });
    }
    
    // Extract from context
    if (context.currentFile) {
      const fileContext = this.contextGenerator.getFileContext(context.currentFile);
      if (fileContext) {
        dependencies.push(...fileContext.dependencies);
      }
    }
    
    return [...new Set(dependencies)];
  }

  /**
   * Extract imports from generated code
   */
  private extractImports(code: string, context: GenerationContext): string[] {
    const imports: string[] = [];
    
    // Extract import statements
    const importMatches = code.match(/import\s+\{([^}]+)\}\s+from/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const contentMatch = match.match(/import\s+\{([^}]+)\}/);
        if (contentMatch) {
          const importedItems = contentMatch[1].split(',').map(item => item.trim());
          imports.push(...importedItems);
        }
      });
    }
    
    return [...new Set(imports)];
  }

  /**
   * Validate generated code
   */
  private async validateGeneratedCode(code: string, context: GenerationContext): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic syntax validation
    try {
      // Check for basic TypeScript syntax
      if (!code.includes('export') && !code.includes('import')) {
        warnings.push('No exports or imports found');
      }
      
      // Check for common patterns
      if (code.includes('any') && !code.includes('// TODO: Replace any')) {
        warnings.push('Uses "any" type - consider adding proper types');
      }
      
      // Check for error handling
      if (code.includes('async') && !code.includes('try') && !code.includes('catch')) {
        warnings.push('Async function without error handling');
      }
      
      // Check for proper naming
      const functionMatches = code.match(/function\s+(\w+)/g);
      if (functionMatches) {
        functionMatches.forEach(match => {
          const nameMatch = match.match(/function\s+(\w+)/);
          if (nameMatch && !/^[A-Z]/.test(nameMatch[1])) {
            warnings.push(`Function ${nameMatch[1]} should start with uppercase`);
          }
        });
      }
      
    } catch (error) {
      errors.push(`Syntax validation failed: ${error}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Find related files based on context
   */
  private findRelatedFiles(context: GenerationContext): string[] {
    const relatedFiles: string[] = [];
    
    // Find files that import or are imported by current file
    if (context.currentFile) {
      const fileContext = this.contextGenerator.getFileContext(context.currentFile);
      if (fileContext) {
        // Add files that this file imports
        relatedFiles.push(...fileContext.dependencies);
        
        // Add files that import this file
        for (const [filePath, deps] of this.contextGenerator['projectContext'].dependencyGraph) {
          if (deps.includes(context.currentFile)) {
            relatedFiles.push(filePath);
          }
        }
      }
    }
    
    return [...new Set(relatedFiles)];
  }

  /**
   * Extract applied patterns from generated code
   */
  private extractAppliedPatterns(code: string): string[] {
    const patterns: string[] = [];
    
    if (code.includes('async')) patterns.push('async-await');
    if (code.includes('try') && code.includes('catch')) patterns.push('error-handling');
    if (code.includes('interface')) patterns.push('interface-definition');
    if (code.includes('class')) patterns.push('class-definition');
    if (code.includes('export')) patterns.push('module-exports');
    if (code.includes('import')) patterns.push('module-imports');
    if (code.includes('Promise')) patterns.push('promise-handling');
    if (code.includes('throw')) patterns.push('error-throwing');
    
    return patterns;
  }

  /**
   * Merge code with existing code
   */
  private mergeCodeWithExisting(existingCode: string, newCode: string, cursorPosition?: number): string {
    if (!cursorPosition) {
      // Append to end of file
      return `${existingCode}\n\n${newCode}`;
    }
    
    // Insert at cursor position
    const before = existingCode.substring(0, cursorPosition);
    const after = existingCode.substring(cursorPosition);
    return `${before}\n${newCode}\n${after}`;
  }

  /**
   * Apply fix to existing code
   */
  private applyFixToCode(existingCode: string, fixCode: string, errorContext: any): string {
    // Simple line-based fix application
    const lines = existingCode.split('\n');
    const errorLine = errorContext.line - 1; // Convert to 0-based index
    
    if (errorLine >= 0 && errorLine < lines.length) {
      // Replace the error line with the fix
      lines[errorLine] = fixCode;
      return lines.join('\n');
    }
    
    // If line replacement fails, append the fix
    return `${existingCode}\n\n// Fix for error: ${errorContext.message}\n${fixCode}`;
  }

  /**
   * Get project statistics
   */
  getProjectStats(): {
    totalFiles: number;
    totalSymbols: number;
    totalDependencies: number;
    recentEdits: number;
  } {
    const projectContext = this.contextGenerator['projectContext'];
    
    return {
      totalFiles: projectContext.files.size,
      totalSymbols: projectContext.symbolTable.size,
      totalDependencies: projectContext.dependencyGraph.size,
      recentEdits: projectContext.recentEdits.length
    };
  }

  /**
   * Update context with recent changes
   */
  updateContext(file: string, change: string): void {
    this.contextGenerator.updateContext(file, change);
  }

  /**
   * Get symbol information
   */
  getSymbol(name: string): CodeSymbol | undefined {
    return this.contextGenerator.getSymbol(name);
  }

  /**
   * Get all symbols in project
   */
  getAllSymbols(): CodeSymbol[] {
    return this.contextGenerator.getAllSymbols();
  }
} 