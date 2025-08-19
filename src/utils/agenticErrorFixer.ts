/**
 * Agentic Error Detection and Fixing System
 * 
 * This module provides surgical error correction without full regeneration,
 * following a controlled, agentic approach similar to Vercel v0 and Cursor.
 */

import { InfrastructureContext } from '../types/infrastructure';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as ts from 'typescript';

const execAsync = promisify(exec);

export interface ErrorContext {
  file: string;
  line: number;
  column?: number;
  error: string;
  code: string;
  context: string;
  errorType: ErrorType;
  severity: 'error' | 'warning' | 'info';
}

export interface ErrorType {
  category: 'syntax' | 'type' | 'import' | 'method' | 'variable' | 'dependency' | 'infrastructure';
  subType: string;
  description: string;
}

export interface FixResult {
  success: boolean;
  applied: boolean;
  fixType: 'auto' | 'semi_auto' | 'manual' | 'stub';
  originalCode?: string;
  fixedCode?: string;
  patch?: CodePatch;
  error?: string;
  attempts: number;
  validated: boolean;
}

export interface CodePatch {
  type: 'insert' | 'replace' | 'delete';
  file: string;
  line: number;
  column?: number;
  originalText: string;
  newText: string;
  description: string;
}

export interface SymbolMap {
  [className: string]: {
    methods: string[];
    properties: string[];
    imports: string[];
    file: string;
  };
}

export interface ErrorFixSession {
  sessionId: string;
  projectPath: string;
  errors: ErrorContext[];
  fixes: FixResult[];
  symbolMap: SymbolMap;
  maxAttempts: number;
  currentAttempt: number;
  status: 'running' | 'completed' | 'failed' | 'escalated';
  startTime: Date;
  endTime?: Date;
}

/**
 * Main error fixing orchestrator
 */
export class AgenticErrorFixer {
  private symbolMap: SymbolMap = {};
  private maxAttemptsPerError = 3;
  private maxTotalAttempts = 10;
  
  constructor(
    private projectPath: string,
    private infrastructureContext: InfrastructureContext,
    private jobId: string
  ) {}
  
  /**
   * Run comprehensive error detection and fixing
   */
  async runErrorFixSession(): Promise<ErrorFixSession> {
    const sessionId = `error-fix-${Date.now()}`;
    const session: ErrorFixSession = {
      sessionId,
      projectPath: this.projectPath,
      errors: [],
      fixes: [],
      symbolMap: {},
      maxAttempts: this.maxTotalAttempts,
      currentAttempt: 0,
      status: 'running',
      startTime: new Date()
    };
    
    console.log(`[AgenticErrorFixer] Starting error fix session: ${sessionId}`);
    
    try {
      // Step 1: Build symbol map
      await this.buildSymbolMap();
      session.symbolMap = this.symbolMap;
      
      // Step 2: Run validation pass
      const errors = await this.runValidationPass();
      session.errors = errors;
      
      console.log(`[AgenticErrorFixer] Detected ${errors.length} errors`);
      
      // Step 3: Fix errors iteratively
      await this.fixErrorsIteratively(session);
      
      session.status = 'completed';
      session.endTime = new Date();
      
      console.log(`[AgenticErrorFixer] Error fix session completed: ${session.fixes.length} fixes applied`);
      
      return session;
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Error fix session failed: ${error.message}`);
      session.status = 'failed';
      session.endTime = new Date();
      return session;
    }
  }
  
  /**
   * Build comprehensive symbol map of the codebase
   */
  private async buildSymbolMap(): Promise<void> {
    console.log(`[AgenticErrorFixer] Building symbol map...`);
    
    const files = await this.getAllSourceFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const sourceFile = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );
        
        const fileSymbols = this.extractSymbolsFromFile(sourceFile, file);
        const relativePath = path.relative(this.projectPath, file);
        
        this.symbolMap[relativePath] = fileSymbols;
        
      } catch (error: any) {
        console.warn(`[AgenticErrorFixer] Failed to parse symbols from ${file}: ${error.message}`);
      }
    }
    
    console.log(`[AgenticErrorFixer] Symbol map built with ${Object.keys(this.symbolMap).length} files`);
  }
  
  /**
   * Extract symbols from a TypeScript file
   */
  private extractSymbolsFromFile(sourceFile: ts.SourceFile, filePath: string): any {
    const symbols: any = {
      methods: [],
      properties: [],
      imports: [],
      file: filePath
    };
    
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodName = member.name.getText(sourceFile);
            symbols.methods.push(methodName);
          } else if (ts.isPropertyDeclaration(member) && member.name) {
            const propertyName = member.name.getText(sourceFile);
            symbols.properties.push(propertyName);
          }
        });
      } else if (ts.isImportDeclaration(node)) {
        const importText = node.getText(sourceFile);
        symbols.imports.push(importText);
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return symbols;
  }
  
  /**
   * Run comprehensive validation pass
   */
  private async runValidationPass(): Promise<ErrorContext[]> {
    console.log(`[AgenticErrorFixer] Running validation pass...`);
    
    const errors: ErrorContext[] = [];
    
    try {
      // TypeScript compilation check
      const tscErrors = await this.runTypeScriptCheck();
      errors.push(...tscErrors);
      
      // ESLint check
      const eslintErrors = await this.runESLintCheck();
      errors.push(...eslintErrors);
      
      // Import resolution check
      const importErrors = await this.checkImportResolution();
      errors.push(...importErrors);
      
      // Method existence check
      const methodErrors = await this.checkMethodExistence();
      errors.push(...methodErrors);
      
      // Variable usage check
      const variableErrors = await this.checkVariableUsage();
      errors.push(...variableErrors);
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Validation pass failed: ${error.message}`);
    }
    
    return errors;
  }
  
  /**
   * Run TypeScript compilation check
   */
  private async runTypeScriptCheck(): Promise<ErrorContext[]> {
    const errors: ErrorContext[] = [];
    
    try {
      const { stderr } = await execAsync('npx tsc --noEmit', { cwd: this.projectPath });
      
      if (stderr) {
        const lines = stderr.split('\n');
        for (const line of lines) {
          const match = line.match(/(.+\.ts)\((\d+),(\d+)\): error TS\d+: (.+)/);
          if (match) {
            const [, file, lineStr, columnStr, error] = match;
            const fullPath = path.resolve(this.projectPath, file);
            
            errors.push({
              file: fullPath,
              line: parseInt(lineStr),
              column: parseInt(columnStr),
              error,
              code: await this.getCodeAtLine(fullPath, parseInt(lineStr)),
              context: await this.getContextAroundLine(fullPath, parseInt(lineStr)),
              errorType: this.classifyError(error),
              severity: 'error'
            });
          }
        }
      }
    } catch (error: any) {
      // TypeScript check failed, but that's expected if there are errors
    }
    
    return errors;
  }
  
  /**
   * Run ESLint check
   */
  private async runESLintCheck(): Promise<ErrorContext[]> {
    const errors: ErrorContext[] = [];
    
    try {
      const { stdout } = await execAsync('npx eslint . --format=json', { cwd: this.projectPath });
      const eslintResults = JSON.parse(stdout);
      
      for (const result of eslintResults) {
        for (const message of result.messages) {
          errors.push({
            file: result.filePath,
            line: message.line,
            column: message.column,
            error: message.message,
            code: await this.getCodeAtLine(result.filePath, message.line),
            context: await this.getContextAroundLine(result.filePath, message.line),
            errorType: this.classifyError(message.message),
            severity: message.severity === 2 ? 'error' : 'warning'
          });
        }
      }
    } catch (error: any) {
      // ESLint check failed, but that's expected if there are errors
    }
    
    return errors;
  }
  
  /**
   * Check import resolution
   */
  private async checkImportResolution(): Promise<ErrorContext[]> {
    const errors: ErrorContext[] = [];
    
    for (const [filePath, symbols] of Object.entries(this.symbolMap)) {
      for (const importStatement of symbols.imports) {
        const importMatch = importStatement.match(/from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          const resolvedPath = await this.resolveImportPath(filePath, importPath);
          
          if (!resolvedPath) {
            errors.push({
              file: path.join(this.projectPath, filePath),
              line: 1, // Will be refined later
              error: `Cannot resolve module '${importPath}'`,
              code: importStatement,
              context: await this.getContextAroundLine(path.join(this.projectPath, filePath), 1),
              errorType: {
                category: 'import',
                subType: 'unresolved',
                description: 'Module cannot be resolved'
              },
              severity: 'error'
            });
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Check method existence
   */
  private async checkMethodExistence(): Promise<ErrorContext[]> {
    const errors: ErrorContext[] = [];
    
    for (const [filePath, symbols] of Object.entries(this.symbolMap)) {
      const content = await fs.readFile(path.join(this.projectPath, filePath), 'utf-8');
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
      
      const methodCalls = this.findMethodCalls(sourceFile);
      
      for (const call of methodCalls) {
        const targetClass = call.targetClass;
        const methodName = call.methodName;
        
        if (targetClass && methodName) {
          const classSymbols = this.findClassSymbols(targetClass);
          if (classSymbols && !classSymbols.methods.includes(methodName)) {
            errors.push({
              file: path.join(this.projectPath, filePath),
              line: call.line,
              column: call.column,
              error: `Method '${methodName}' does not exist on type '${targetClass}'`,
              code: call.code,
              context: await this.getContextAroundLine(path.join(this.projectPath, filePath), call.line),
              errorType: {
                category: 'method',
                subType: 'missing',
                description: 'Method does not exist on class'
              },
              severity: 'error'
            });
          }
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Check variable usage
   */
  private async checkVariableUsage(): Promise<ErrorContext[]> {
    const errors: ErrorContext[] = [];
    
    for (const [filePath] of Object.entries(this.symbolMap)) {
      const content = await fs.readFile(path.join(this.projectPath, filePath), 'utf-8');
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
      
      const undefinedVars = this.findUndefinedVariables(sourceFile);
      
      for (const variable of undefinedVars) {
        errors.push({
          file: path.join(this.projectPath, filePath),
          line: variable.line,
          column: variable.column,
          error: `Variable '${variable.name}' is not defined`,
          code: variable.code,
          context: await this.getContextAroundLine(path.join(this.projectPath, filePath), variable.line),
          errorType: {
            category: 'variable',
            subType: 'undefined',
            description: 'Variable is not defined'
          },
          severity: 'error'
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Fix errors iteratively
   */
  private async fixErrorsIteratively(session: ErrorFixSession): Promise<void> {
    let currentErrors = [...session.errors];
    let attemptCount = 0;
    
    while (currentErrors.length > 0 && attemptCount < this.maxTotalAttempts) {
      attemptCount++;
      session.currentAttempt = attemptCount;
      
      console.log(`[AgenticErrorFixer] Fix attempt ${attemptCount}: ${currentErrors.length} errors remaining`);
      
      const newErrors: ErrorContext[] = [];
      
      for (const error of currentErrors) {
        const fixResult = await this.fixError(error, session);
        session.fixes.push(fixResult);
        
        if (!fixResult.success || !fixResult.validated) {
          newErrors.push(error);
        }
      }
      
      // If no progress was made, break to avoid infinite loop
      if (newErrors.length >= currentErrors.length) {
        console.log(`[AgenticErrorFixer] No progress made in attempt ${attemptCount}, escalating`);
        session.status = 'escalated';
        break;
      }
      
      currentErrors = newErrors;
      
      // Re-run validation to get updated errors
      if (currentErrors.length > 0) {
        await this.buildSymbolMap(); // Rebuild symbol map after fixes
        session.symbolMap = this.symbolMap;
        currentErrors = await this.runValidationPass();
      }
    }
    
    if (currentErrors.length > 0) {
      console.log(`[AgenticErrorFixer] ${currentErrors.length} errors remain after ${attemptCount} attempts`);
      session.status = 'escalated';
    }
  }
  
  /**
   * Fix a single error
   */
  private async fixError(error: ErrorContext, session: ErrorFixSession): Promise<FixResult> {
    console.log(`[AgenticErrorFixer] Fixing error: ${error.error} in ${error.file}:${error.line}`);
    
    const fixResult: FixResult = {
      success: false,
      applied: false,
      fixType: 'manual',
      attempts: 0,
      validated: false
    };
    
    try {
      // Generate fix based on error type
      const fix = await this.generateFix(error, session);
      
      if (fix) {
        // Apply the fix
        const applied = await this.applyFix(fix);
        fixResult.applied = applied;
        fixResult.originalCode = fix.originalText;
        fixResult.fixedCode = fix.newText;
        fixResult.patch = fix;
        fixResult.fixType = 'auto';
        
        if (applied) {
          // Validate the fix
          const validationResult = await this.validateFix(error, session);
          fixResult.validated = validationResult;
          fixResult.success = validationResult;
        }
      } else {
        // Generate stub as fallback
        const stub = await this.generateStub(error, session);
        if (stub) {
          const applied = await this.applyFix(stub);
          fixResult.applied = applied;
          fixResult.fixType = 'stub';
          fixResult.originalCode = stub.originalText;
          fixResult.fixedCode = stub.newText;
          fixResult.patch = stub;
          fixResult.success = applied;
          fixResult.validated = applied;
        }
      }
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Error fixing ${error.file}:${error.line}: ${error.message}`);
      fixResult.error = error.message;
    }
    
    return fixResult;
  }
  
  /**
   * Generate fix for an error
   */
  private async generateFix(error: ErrorContext, session: ErrorFixSession): Promise<CodePatch | null> {
    const prompt = this.buildFixPrompt(error, session);
    
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      });
      
      const fixCode = response.choices[0]?.message?.content || '';
      
      if (fixCode.trim()) {
        return {
          type: 'replace',
          file: error.file,
          line: error.line,
          column: error.column,
          originalText: error.code,
          newText: fixCode.trim(),
          description: `Fix for ${error.errorType.description}`
        };
      }
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Failed to generate fix: ${error.message}`);
    }
    
    return null;
  }
  
  /**
   * Generate stub for an error
   */
  private async generateStub(error: ErrorContext, session: ErrorFixSession): Promise<CodePatch | null> {
    const prompt = this.buildStubPrompt(error, session);
    
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1
      });
      
      const stubCode = response.choices[0]?.message?.content || '';
      
      if (stubCode.trim()) {
        return {
          type: 'insert',
          file: error.file,
          line: error.line,
          column: error.column,
          originalText: '',
          newText: stubCode.trim(),
          description: `Stub for ${error.errorType.description}`
        };
      }
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Failed to generate stub: ${error.message}`);
    }
    
    return null;
  }
  
  /**
   * Build fix prompt
   */
  private buildFixPrompt(error: ErrorContext, session: ErrorFixSession): string {
    const symbolContext = this.getSymbolContext(error, session);
    
    return `You are fixing a TypeScript codebase.

The following error occurred:
- File: ${path.basename(error.file)}
- Line: ${error.line}
- Error: ${error.error}
- Code: ${error.code}
- Context: ${error.context}

Symbol map for this file:
${JSON.stringify(symbolContext, null, 2)}

Error type: ${error.errorType.category}/${error.errorType.subType}

Fix this specific error by providing only the corrected code that should replace the problematic line.
Do not provide explanations, just the fixed code.`;
  }
  
  /**
   * Build stub prompt
   */
  private buildStubPrompt(error: ErrorContext, session: ErrorFixSession): string {
    return `You are creating a stub for a TypeScript codebase.

The following error occurred:
- File: ${path.basename(error.file)}
- Line: ${error.line}
- Error: ${error.error}
- Code: ${error.code}

Create a minimal stub that will allow the code to compile without errors.
Provide only the stub code, no explanations.`;
  }
  
  /**
   * Apply a code patch
   */
  private async applyFix(patch: CodePatch): Promise<boolean> {
    try {
      const content = await fs.readFile(patch.file, 'utf-8');
      const lines = content.split('\n');
      
      if (patch.type === 'replace') {
        if (patch.line <= lines.length) {
          lines[patch.line - 1] = patch.newText;
          await fs.writeFile(patch.file, lines.join('\n'), 'utf-8');
          return true;
        }
      } else if (patch.type === 'insert') {
        lines.splice(patch.line - 1, 0, patch.newText);
        await fs.writeFile(patch.file, lines.join('\n'), 'utf-8');
        return true;
      }
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Failed to apply patch: ${error.message}`);
    }
    
    return false;
  }
  
  /**
   * Validate a fix
   */
  private async validateFix(error: ErrorContext, session: ErrorFixSession): Promise<boolean> {
    try {
      // Re-run the specific validation that caught this error
      const newErrors = await this.runValidationPass();
      const hasSameError = newErrors.some(e => 
        e.file === error.file && 
        e.line === error.line && 
        e.error === error.error
      );
      
      return !hasSameError;
      
    } catch (error: any) {
      console.error(`[AgenticErrorFixer] Failed to validate fix: ${error.message}`);
      return false;
    }
  }
  
  // Helper methods
  
  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDirectory(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && /\.(ts|js|tsx|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await scanDirectory(this.projectPath);
    return files;
  }
  
  private classifyError(errorMessage: string): ErrorType {
    if (errorMessage.includes('Cannot find module')) {
      return { category: 'import', subType: 'unresolved', description: 'Module cannot be resolved' };
    } else if (errorMessage.includes('does not exist on type')) {
      return { category: 'method', subType: 'missing', description: 'Method does not exist on class' };
    } else if (errorMessage.includes('is not defined')) {
      return { category: 'variable', subType: 'undefined', description: 'Variable is not defined' };
    } else if (errorMessage.includes('Type')) {
      return { category: 'type', subType: 'mismatch', description: 'Type mismatch' };
    } else {
      return { category: 'syntax', subType: 'unknown', description: 'Syntax error' };
    }
  }
  
  private async getCodeAtLine(file: string, line: number): Promise<string> {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      return lines[line - 1] || '';
    } catch {
      return '';
    }
  }
  
  private async getContextAroundLine(file: string, line: number): Promise<string> {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, line - 3);
      const end = Math.min(lines.length, line + 2);
      return lines.slice(start, end).join('\n');
    } catch {
      return '';
    }
  }
  
  private async resolveImportPath(filePath: string, importPath: string): Promise<string | null> {
    // Simplified import resolution
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(filePath), importPath);
      try {
        await fs.access(resolvedPath + '.ts');
        return resolvedPath + '.ts';
      } catch {
        try {
          await fs.access(resolvedPath + '/index.ts');
          return resolvedPath + '/index.ts';
        } catch {
          return null;
        }
      }
    }
    return null;
  }
  
  private findMethodCalls(sourceFile: ts.SourceFile): Array<{targetClass: string, methodName: string, line: number, column: number, code: string}> {
    const calls: Array<{targetClass: string, methodName: string, line: number, column: number, code: string}> = [];
    
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const propertyAccess = node.expression;
        const targetClass = propertyAccess.expression.getText(sourceFile);
        const methodName = propertyAccess.name.getText(sourceFile);
        
        calls.push({
          targetClass,
          methodName,
          line: sourceFile.getLineAndCharacterOfPosition(propertyAccess.getStart()).line + 1,
          column: sourceFile.getLineAndCharacterOfPosition(propertyAccess.getStart()).character + 1,
          code: propertyAccess.getText(sourceFile)
        });
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return calls;
  }
  
  private findUndefinedVariables(sourceFile: ts.SourceFile): Array<{name: string, line: number, column: number, code: string}> {
    const variables: Array<{name: string, line: number, column: number, code: string}> = [];
    
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const symbol = (sourceFile as any).symbolTable?.get(node.text);
        if (!symbol) {
          variables.push({
            name: node.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            column: sourceFile.getLineAndCharacterOfPosition(node.getStart()).character + 1,
            code: node.getText(sourceFile)
          });
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return variables;
  }
  
  private findClassSymbols(className: string): any {
    for (const [filePath, symbols] of Object.entries(this.symbolMap)) {
      if (filePath.includes(className) || symbols.methods.length > 0) {
        return symbols;
      }
    }
    return null;
  }
  
  private getSymbolContext(error: ErrorContext, session: ErrorFixSession): any {
    const filePath = path.relative(this.projectPath, error.file);
    return session.symbolMap[filePath] || {};
  }
}

/**
 * Run agentic error fixing for a project
 */
export async function runAgenticErrorFixing(
  projectPath: string,
  infrastructureContext: InfrastructureContext,
  jobId: string
): Promise<ErrorFixSession> {
  const fixer = new AgenticErrorFixer(projectPath, infrastructureContext, jobId);
  return await fixer.runErrorFixSession();
} 