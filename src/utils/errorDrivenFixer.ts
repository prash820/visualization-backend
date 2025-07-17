import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { openai, OPENAI_MODEL } from '../config/aiProvider';

const execAsync = promisify(exec);

// Error-driven recursive fixing system (like Vercel/Cursor)
export class ErrorDrivenFixer {
  private errorStack: CompilationError[] = [];
  private fileDependencyGraph: Map<string, string[]> = new Map();
  private fixedFiles: Set<string> = new Set();
  private maxRecursionDepth: number = 10;
  private currentDepth: number = 0;

  constructor(private projectPath: string, private appType: string, private framework: string) {}

  /**
   * Main entry point: Build, capture errors, and fix recursively
   */
  async fixCodeRecursively(): Promise<FixResult> {
    console.log(`[ErrorDrivenFixer] Starting recursive error fixing for ${this.appType} with ${this.framework}`);
    
    try {
      // Step 1: Build the project and capture all errors
      console.log(`[ErrorDrivenFixer] Step 1: Building project to capture errors...`);
      const buildResult = await this.buildProject();
      
      if (buildResult.success) {
        console.log(`[ErrorDrivenFixer] ✅ Build successful on first attempt!`);
        return {
          success: true,
          errorsFixed: 0,
          totalErrors: 0,
          buildTime: buildResult.buildTime,
          filesModified: [],
          errorHistory: []
        };
      }

      // Step 2: Analyze file dependencies and create topological sort
      console.log(`[ErrorDrivenFixer] Step 2: Analyzing file dependencies...`);
      await this.analyzeFileDependencies();
      const sortedFiles = this.topologicalSort();

      // Step 3: Fix errors recursively from leaf to root
      console.log(`[ErrorDrivenFixer] Step 3: Starting recursive error fixing...`);
      const fixResult = await this.fixErrorsRecursively(buildResult.errors, sortedFiles);

      // Step 4: Final build verification
      console.log(`[ErrorDrivenFixer] Step 4: Final build verification...`);
      const finalBuild = await this.buildProject();
      
      return {
        success: finalBuild.success,
        errorsFixed: fixResult.errorsFixed,
        totalErrors: buildResult.errors.length,
        buildTime: finalBuild.buildTime,
        filesModified: Array.from(this.fixedFiles),
        errorHistory: fixResult.errorHistory
      };

    } catch (error) {
      console.error(`[ErrorDrivenFixer] Fatal error in recursive fixing:`, error);
      return {
        success: false,
        errorsFixed: 0,
        totalErrors: this.errorStack.length,
        buildTime: 0,
        filesModified: [],
        errorHistory: [],
        fatalError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Build the project and capture all compilation errors
   */
  private async buildProject(): Promise<BuildResult> {
    const startTime = Date.now();
    
    try {
      // Frontend build (TypeScript check)
      const frontendPath = path.join(this.projectPath, "frontend");
      const frontendBuild = await this.buildFrontend(frontendPath);
      
      // Backend build (TypeScript check)
      const backendPath = path.join(this.projectPath, "backend");
      const backendBuild = await this.buildBackend(backendPath);
      
      const allErrors = [...frontendBuild.errors, ...backendBuild.errors];
      const buildTime = Date.now() - startTime;
      
      console.log(`[ErrorDrivenFixer] Build completed in ${buildTime}ms`);
      console.log(`[ErrorDrivenFixer] Errors found: ${allErrors.length} (${frontendBuild.errors.length} frontend, ${backendBuild.errors.length} backend)`);
      
      return {
        success: allErrors.length === 0,
        errors: allErrors,
        buildTime,
        frontendErrors: frontendBuild.errors,
        backendErrors: backendBuild.errors
      };
      
    } catch (error) {
      console.error(`[ErrorDrivenFixer] Build failed:`, error);
      return {
        success: false,
        errors: [{
          file: 'build-system',
          line: 1,
          column: 1,
          message: `Build system error: ${error instanceof Error ? error.message : String(error)}`,
          code: 'BUILD_SYSTEM_ERROR',
          severity: 'error'
        }],
        buildTime: Date.now() - startTime,
        frontendErrors: [],
        backendErrors: []
      };
    }
  }

  /**
   * Build frontend (TypeScript compilation check)
   */
  private async buildFrontend(frontendPath: string): Promise<{ errors: CompilationError[] }> {
    const errors: CompilationError[] = [];
    
    try {
      // Check if TypeScript is available
      const packageJsonPath = path.join(frontendPath, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        errors.push({
          file: 'package.json',
          line: 1,
          column: 1,
          message: 'Frontend package.json not found',
          code: 'MISSING_PACKAGE_JSON',
          severity: 'error'
        });
        return { errors };
      }

      // Run TypeScript compiler
      const command = `cd "${frontendPath}" && npx tsc --noEmit --pretty false 2>&1`;
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      
      // Parse TypeScript output
      const output = stderr || stdout;
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.includes('Found 0 errors')) {
          const error = this.parseTypeScriptError(line, frontendPath);
          if (error) {
            errors.push(error);
          }
        }
      }
      
    } catch (error: any) {
      // Parse error output from failed command
      const errorOutput = error.stderr || error.message;
      const lines = errorOutput.split('\n');
      
      for (const line of lines) {
        if (line.trim() && line.includes('error TS')) {
          const error = this.parseTypeScriptError(line, frontendPath);
          if (error) {
            errors.push(error);
          }
        }
      }
    }
    
    return { errors };
  }

  /**
   * Build backend (TypeScript compilation check)
   */
  private async buildBackend(backendPath: string): Promise<{ errors: CompilationError[] }> {
    const errors: CompilationError[] = [];
    
    try {
      // Check if TypeScript is available
      const packageJsonPath = path.join(backendPath, "package.json");
      if (!fs.existsSync(packageJsonPath)) {
        errors.push({
          file: 'package.json',
          line: 1,
          column: 1,
          message: 'Backend package.json not found',
          code: 'MISSING_PACKAGE_JSON',
          severity: 'error'
        });
        return { errors };
      }

      // Run TypeScript compiler
      const command = `cd "${backendPath}" && npx tsc --noEmit --pretty false 2>&1`;
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      
      // Parse TypeScript output
      const output = stderr || stdout;
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.includes('Found 0 errors')) {
          const error = this.parseTypeScriptError(line, backendPath);
          if (error) {
            errors.push(error);
          }
        }
      }
      
    } catch (error: any) {
      // Parse error output from failed command
      const errorOutput = error.stderr || error.message;
      const lines = errorOutput.split('\n');
      
      for (const line of lines) {
        if (line.trim() && line.includes('error TS')) {
          const error = this.parseTypeScriptError(line, backendPath);
          if (error) {
            errors.push(error);
          }
        }
      }
    }
    
    return { errors };
  }

  /**
   * Parse TypeScript error output
   */
  private parseTypeScriptError(line: string, basePath: string): CompilationError | null {
    // Match TypeScript error format: file(line,col): error message
    const match = line.match(/(.+)\((\d+),(\d+)\):\s*(.+)/);
    if (!match) return null;
    
    const [, filePath, lineNum, column, message] = match;
    const relativePath = path.relative(basePath, filePath);
    
    return {
      file: relativePath,
      line: parseInt(lineNum),
      column: parseInt(column),
      message: message.trim(),
      code: this.extractErrorCode(message),
      severity: message.includes('error TS') ? 'error' : 'warning'
    };
  }

  /**
   * Extract error code from TypeScript message
   */
  private extractErrorCode(message: string): string {
    const codeMatch = message.match(/error TS(\d+)/);
    return codeMatch ? `TS${codeMatch[1]}` : 'UNKNOWN_ERROR';
  }

  /**
   * Analyze file dependencies to create dependency graph
   */
  private async analyzeFileDependencies(): Promise<void> {
    console.log(`[ErrorDrivenFixer] Analyzing file dependencies...`);
    
    const frontendPath = path.join(this.projectPath, "frontend", "src");
    const backendPath = path.join(this.projectPath, "backend", "src");
    
    // Analyze frontend dependencies
    if (fs.existsSync(frontendPath)) {
      await this.analyzeDirectoryDependencies(frontendPath, 'frontend');
    }
    
    // Analyze backend dependencies
    if (fs.existsSync(backendPath)) {
      await this.analyzeDirectoryDependencies(backendPath, 'backend');
    }
    
    console.log(`[ErrorDrivenFixer] Dependency graph created with ${this.fileDependencyGraph.size} files`);
  }

  /**
   * Analyze dependencies in a directory
   */
  private async analyzeDirectoryDependencies(dirPath: string, type: string): Promise<void> {
    const files = this.getAllTypeScriptFiles(dirPath);
    
    for (const file of files) {
      const relativePath = path.relative(dirPath, file);
      const dependencies = await this.extractFileDependencies(file, dirPath);
      
      this.fileDependencyGraph.set(`${type}/${relativePath}`, dependencies);
    }
  }

  /**
   * Get all TypeScript files in a directory recursively
   */
  private getAllTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    const walk = (currentPath: string) => {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
    };
    
    walk(dirPath);
    return files;
  }

  /**
   * Extract import dependencies from a file
   */
  private async extractFileDependencies(filePath: string, basePath: string): Promise<string[]> {
    const dependencies: string[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Match import statements
        const importMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          
          // Convert import path to file path
          const dependencyPath = this.resolveImportPath(importPath, filePath, basePath);
          if (dependencyPath) {
            dependencies.push(dependencyPath);
          }
        }
      }
    } catch (error) {
      console.warn(`[ErrorDrivenFixer] Could not analyze dependencies for ${filePath}:`, error);
    }
    
    return dependencies;
  }

  /**
   * Resolve import path to actual file path
   */
  private resolveImportPath(importPath: string, currentFile: string, basePath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
      const relativePath = path.relative(basePath, resolvedPath);
      return relativePath;
    }
    
    // Handle absolute imports (like @/components/...)
    if (importPath.startsWith('@/')) {
      const relativePath = importPath.substring(2); // Remove @/
      return relativePath;
    }
    
    return null;
  }

  /**
   * Topological sort of files based on dependencies
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: string[] = [];
    
    const visit = (file: string): boolean => {
      if (tempVisited.has(file)) {
        // Circular dependency detected
        console.warn(`[ErrorDrivenFixer] Circular dependency detected for ${file}`);
        return false;
      }
      
      if (visited.has(file)) {
        return true;
      }
      
      tempVisited.add(file);
      
      const dependencies = this.fileDependencyGraph.get(file) || [];
      for (const dep of dependencies) {
        if (!visit(dep)) {
          return false;
        }
      }
      
      tempVisited.delete(file);
      visited.add(file);
      sorted.push(file);
      
      return true;
    };
    
    // Visit all files
    for (const file of this.fileDependencyGraph.keys()) {
      if (!visited.has(file)) {
        visit(file);
      }
    }
    
    console.log(`[ErrorDrivenFixer] Topological sort completed: ${sorted.length} files`);
    return sorted;
  }

  /**
   * Fix errors recursively from leaf to root
   */
  private async fixErrorsRecursively(initialErrors: CompilationError[], sortedFiles: string[]): Promise<RecursiveFixResult> {
    let currentErrors = [...initialErrors];
    let totalFixed = 0;
    const errorHistory: ErrorFixHistory[] = [];
    
    // Start from leaf files (end of sorted array)
    for (let i = sortedFiles.length - 1; i >= 0; i--) {
      const file = sortedFiles[i];
      const fileErrors = currentErrors.filter(error => error.file === file);
      
      if (fileErrors.length > 0) {
        console.log(`[ErrorDrivenFixer] Fixing ${fileErrors.length} errors in ${file} (leaf level ${sortedFiles.length - i})`);
        
        const fixResult = await this.fixFileErrors(file, fileErrors);
        
        if (fixResult.success) {
          totalFixed += fixResult.errorsFixed;
          this.fixedFiles.add(file);
          
          errorHistory.push({
            file,
            errorsFixed: fixResult.errorsFixed,
            errors: fileErrors,
            timestamp: new Date().toISOString()
          });
          
          // Rebuild to get updated errors
          const rebuildResult = await this.buildProject();
          currentErrors = rebuildResult.errors;
          
          console.log(`[ErrorDrivenFixer] Fixed ${fixResult.errorsFixed} errors in ${file}, ${currentErrors.length} errors remaining`);
          
          // If no more errors, we're done
          if (currentErrors.length === 0) {
            console.log(`[ErrorDrivenFixer] ✅ All errors fixed!`);
            break;
          }
        } else {
          console.warn(`[ErrorDrivenFixer] Failed to fix errors in ${file}`);
        }
      }
    }
    
    return {
      errorsFixed: totalFixed,
      errorHistory
    };
  }

  /**
   * Fix errors in a single file using AI
   */
  private async fixFileErrors(file: string, errors: CompilationError[]): Promise<FileFixResult> {
    try {
      const fullPath = this.getFullFilePath(file);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`[ErrorDrivenFixer] File not found: ${fullPath}`);
        return { success: false, errorsFixed: 0 };
      }
      
      const originalCode = fs.readFileSync(fullPath, 'utf8');
      const errorContext = this.buildErrorContext(file, errors);
      
      console.log(`[ErrorDrivenFixer] Sending ${errors.length} errors to AI for ${file}`);
      
      const fixedCode = await this.fixCodeWithAI(originalCode, errorContext, file);
      
      if (fixedCode !== originalCode) {
        fs.writeFileSync(fullPath, fixedCode);
        
        // Verify the fix by checking if errors are resolved
        const verificationErrors = await this.verifyFileFix(file, errors);
        const actuallyFixed = errors.length - verificationErrors.length;
        
        return {
          success: true,
          errorsFixed: actuallyFixed
        };
      }
      
      return { success: false, errorsFixed: 0 };
      
    } catch (error) {
      console.error(`[ErrorDrivenFixer] Error fixing file ${file}:`, error);
      return { success: false, errorsFixed: 0 };
    }
  }

  /**
   * Get full file path from relative path
   */
  private getFullFilePath(relativePath: string): string {
    if (relativePath.startsWith('frontend/')) {
      return path.join(this.projectPath, relativePath);
    } else if (relativePath.startsWith('backend/')) {
      return path.join(this.projectPath, relativePath);
    }
    return path.join(this.projectPath, relativePath);
  }

  /**
   * Build error context for AI
   */
  private buildErrorContext(file: string, errors: CompilationError[]): string {
    const errorDetails = errors.map(error => 
      `Line ${error.line}, Column ${error.column}: ${error.message} (${error.code})`
    ).join('\n');
    
    return `File: ${file}
Application Type: ${this.appType}
Framework: ${this.framework}

Errors to fix:
${errorDetails}

Error Summary:
- Total errors: ${errors.length}
- Error types: ${[...new Set(errors.map(e => e.code))].join(', ')}
- Severity: ${errors.some(e => e.severity === 'error') ? 'Contains errors' : 'Warnings only'}`;
  }

  /**
   * Fix code using AI with detailed error context
   */
  private async fixCodeWithAI(originalCode: string, errorContext: string, file: string): Promise<string> {
    const prompt = `You are an expert TypeScript/React developer fixing compilation errors. Fix the following errors in the code:

${errorContext}

**Original Code:**
\`\`\`typescript
${originalCode}
\`\`\`

**CRITICAL FIXING INSTRUCTIONS:**
1. Fix ALL TypeScript compilation errors listed above
2. Add missing imports (especially React for frontend components)
3. Add proper TypeScript type annotations
4. Fix syntax errors (unmatched braces, etc.)
5. Add missing export statements
6. Ensure all variables are properly defined
7. Fix import/export paths to match the file structure
8. Maintain the same functionality while fixing errors
9. Do NOT add any explanatory comments or markdown
10. Return ONLY the fixed code

**Common Fixes:**
- Add "import React from 'react';" for React components
- Add proper useState<Type> annotations
- Add "export default ComponentName;" for components
- Fix unmatched braces and parentheses
- Add proper TypeScript interfaces
- Fix import paths to use correct relative/absolute paths

**CRITICAL REQUIREMENTS:**
- Return ONLY the fixed code
- NO markdown formatting
- NO code fences
- NO explanatory text
- Start with the first line of code and end with the last line
- Ensure the code compiles without errors

Return the fixed code:`;

    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
        temperature: 0.1
      });
      
      let fixedCode = response.choices[0]?.message?.content?.trim() || originalCode;
      
      // Clean the response to extract just the code
      fixedCode = fixedCode.replace(/^```[a-zA-Z]*\s*/, '');
      fixedCode = fixedCode.replace(/```\s*$/, '');
      
      return fixedCode;
      
    } catch (error) {
      console.error(`[ErrorDrivenFixer] AI fix failed for ${file}:`, error);
      return originalCode;
    }
  }

  /**
   * Verify that file fixes actually resolved the errors
   */
  private async verifyFileFix(file: string, originalErrors: CompilationError[]): Promise<CompilationError[]> {
    try {
      const fullPath = this.getFullFilePath(file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Quick syntax check
      const remainingErrors: CompilationError[] = [];
      
      for (const error of originalErrors) {
        const lines = content.split('\n');
        const line = lines[error.line - 1];
        
        // Check if the specific error is still present
        if (this.errorStillExists(error, line, content)) {
          remainingErrors.push(error);
        }
      }
      
      return remainingErrors;
      
    } catch (error) {
      console.error(`[ErrorDrivenFixer] Error verifying fix for ${file}:`, error);
      return originalErrors;
    }
  }

  /**
   * Check if a specific error still exists in the fixed code
   */
  private errorStillExists(error: CompilationError, line: string, content: string): boolean {
    switch (error.code) {
      case 'TS2307': // Cannot find module
        return content.includes(error.message.split("'")[1] || '');
      case 'TS2339': // Property does not exist
        return line.includes(error.message.split("'")[1] || '');
      case 'TS2322': // Type assignment error
        return line.includes(error.message.split("'")[1] || '');
      default:
        // For other errors, check if the problematic line still exists
        return line.includes(error.message.split("'")[1] || '');
    }
  }
}

// Types for the error-driven fixing system
export interface CompilationError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface BuildResult {
  success: boolean;
  errors: CompilationError[];
  buildTime: number;
  frontendErrors: CompilationError[];
  backendErrors: CompilationError[];
}

export interface FixResult {
  success: boolean;
  errorsFixed: number;
  totalErrors: number;
  buildTime: number;
  filesModified: string[];
  errorHistory: ErrorFixHistory[];
  fatalError?: string;
}

export interface RecursiveFixResult {
  errorsFixed: number;
  errorHistory: ErrorFixHistory[];
}

export interface FileFixResult {
  success: boolean;
  errorsFixed: number;
}

export interface ErrorFixHistory {
  file: string;
  errorsFixed: number;
  errors: CompilationError[];
  timestamp: string;
} 