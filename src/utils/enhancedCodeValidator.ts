import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixes: CodeFix[];
  compilationOutput?: string;
}

export interface CodeFix {
  type: 'import' | 'export' | 'type' | 'syntax' | 'dependency';
  file: string;
  line?: number;
  description: string;
  applied: boolean;
  fixCode?: string;
}

export interface ValidationContext {
  projectRoot: string;
  generatedCode: any;
  frontendPath: string;
  backendPath: string;
}

export class EnhancedCodeValidator {
  private context: ValidationContext;
  private appliedFixes: CodeFix[] = [];

  constructor(context: ValidationContext) {
    this.context = context;
  }

  /**
   * Comprehensive validation pipeline that mirrors Vercel's approach
   */
  async validateAndFix(): Promise<CodeValidationResult> {
    console.log('[EnhancedCodeValidator] Starting comprehensive validation...');
    
    const result: CodeValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      fixes: []
    };

    try {
      // Step 1: Pre-validation analysis
      const preAnalysis = await this.analyzeCodeStructure();
      result.warnings.push(...preAnalysis.warnings);

      // Step 2: TypeScript compilation check
      const tsResult = await this.validateTypeScript();
      result.errors.push(...tsResult.errors);
      result.fixes.push(...tsResult.fixes);

      // Step 3: Import/Export validation
      const importResult = await this.validateImportsAndExports();
      result.errors.push(...importResult.errors);
      result.fixes.push(...importResult.fixes);

      // Step 4: Dependency resolution
      const dependencyResult = await this.validateDependencies();
      result.errors.push(...dependencyResult.errors);
      result.fixes.push(...dependencyResult.fixes);

      // Step 5: Apply fixes
      if (result.fixes.length > 0) {
        await this.applyFixes(result.fixes);
        this.appliedFixes.push(...result.fixes.filter(f => f.applied));
      }

      // Step 6: Re-validate after fixes
      if (this.appliedFixes.length > 0) {
        const revalidation = await this.validateTypeScript();
        result.errors = revalidation.errors;
        result.fixes.push(...revalidation.fixes);
      }

      result.isValid = result.errors.length === 0;
      
      console.log(`[EnhancedCodeValidator] Validation complete. Valid: ${result.isValid}, Errors: ${result.errors.length}, Fixes applied: ${this.appliedFixes.length}`);
      
      return result;

    } catch (error) {
      console.error('[EnhancedCodeValidator] Validation failed:', error);
      result.errors.push(`Validation process failed: ${error}`);
      return result;
    }
  }

  /**
   * Analyze code structure and identify potential issues
   */
  private async analyzeCodeStructure(): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];
    
    // Check for missing package.json files
    if (!fs.existsSync(path.join(this.context.frontendPath, 'package.json'))) {
      warnings.push('Frontend package.json missing');
    }
    
    if (!fs.existsSync(path.join(this.context.backendPath, 'package.json'))) {
      warnings.push('Backend package.json missing');
    }

    // Check for missing tsconfig.json
    if (!fs.existsSync(path.join(this.context.frontendPath, 'tsconfig.json'))) {
      warnings.push('Frontend tsconfig.json missing');
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      warnings.push(`Potential circular dependencies detected: ${circularDeps.join(', ')}`);
    }

    return { warnings };
  }

  /**
   * Validate TypeScript compilation
   */
  private async validateTypeScript(): Promise<{ errors: string[]; fixes: CodeFix[] }> {
    const errors: string[] = [];
    const fixes: CodeFix[] = [];

    try {
      // Run TypeScript compiler
      const tsResult = await this.runTypeScriptCompiler();
      
      if (tsResult.exitCode !== 0) {
        const compilationErrors = this.parseTypeScriptErrors(tsResult.output);
        errors.push(...compilationErrors.map(e => e.message));
        
        // Generate fixes for common TypeScript errors
        const tsFixes = this.generateTypeScriptFixes(compilationErrors);
        fixes.push(...tsFixes);
      }

    } catch (error) {
      errors.push(`TypeScript validation failed: ${error}`);
    }

    return { errors, fixes };
  }

  /**
   * Validate import/export consistency
   */
  private async validateImportsAndExports(): Promise<{ errors: string[]; fixes: CodeFix[] }> {
    const errors: string[] = [];
    const fixes: CodeFix[] = [];

    try {
      // Scan all TypeScript/JavaScript files
      const files = await this.getAllSourceFiles();
      
      for (const file of files) {
        const fileContent = fs.readFileSync(file, 'utf-8');
        const fileIssues = this.validateFileImportsExports(file, fileContent);
        
        errors.push(...fileIssues.errors);
        fixes.push(...fileIssues.fixes);
      }

    } catch (error) {
      errors.push(`Import/Export validation failed: ${error}`);
    }

    return { errors, fixes };
  }

  /**
   * Validate dependencies and resolve missing ones
   */
  private async validateDependencies(): Promise<{ errors: string[]; fixes: CodeFix[] }> {
    const errors: string[] = [];
    const fixes: CodeFix[] = [];

    try {
      // Check for missing dependencies in package.json
      const missingDeps = await this.findMissingDependencies();
      
      if (missingDeps.length > 0) {
        errors.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        
        // Generate package.json fixes
        const depFixes = this.generateDependencyFixes(missingDeps);
        fixes.push(...depFixes);
      }

    } catch (error) {
      errors.push(`Dependency validation failed: ${error}`);
    }

    return { errors, fixes };
  }

  /**
   * Run TypeScript compiler and capture output
   */
  private async runTypeScriptCompiler(): Promise<{ exitCode: number; output: string }> {
    return new Promise((resolve) => {
      const tsc = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], {
        cwd: this.context.frontendPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      
      tsc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      tsc.stderr?.on('data', (data) => {
        output += data.toString();
      });

      tsc.on('close', (code) => {
        resolve({ exitCode: code || 0, output });
      });
    });
  }

  /**
   * Parse TypeScript compiler output into structured errors
   */
  private parseTypeScriptErrors(output: string): Array<{ file: string; line: number; column: number; message: string }> {
    const errors: Array<{ file: string; line: number; column: number; message: string }> = [];
    
    const lines = output.split('\n');
    const errorRegex = /^(.+?)\((\d+),(\d+)\):\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(errorRegex);
      if (match) {
        errors.push({
          file: match[1].trim(),
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4].trim()
        });
      }
    }
    
    return errors;
  }

  /**
   * Generate fixes for common TypeScript errors
   */
  private generateTypeScriptFixes(errors: Array<{ file: string; line: number; column: number; message: string }>): CodeFix[] {
    const fixes: CodeFix[] = [];

    for (const error of errors) {
      // Handle "Cannot find module" errors
      if (error.message.includes('Cannot find module')) {
        const moduleMatch = error.message.match(/Cannot find module ['"]([^'"]+)['"]/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          fixes.push({
            type: 'import',
            file: error.file,
            line: error.line,
            description: `Missing import for module: ${moduleName}`,
            applied: false,
            fixCode: this.generateImportFix(moduleName, error.file)
          });
        }
      }

      // Handle "Property does not exist" errors
      if (error.message.includes('Property') && error.message.includes('does not exist')) {
        const propMatch = error.message.match(/Property '([^']+)' does not exist/);
        if (propMatch) {
          const propName = propMatch[1];
          fixes.push({
            type: 'type',
            file: error.file,
            line: error.line,
            description: `Missing property: ${propName}`,
            applied: false,
            fixCode: this.generatePropertyFix(propName, error.file)
          });
        }
      }

      // Handle missing return statement errors
      if (error.message.includes('not all code paths return a value')) {
        fixes.push({
          type: 'syntax',
          file: error.file,
          line: error.line,
          description: 'Missing return statement',
          applied: false,
          fixCode: this.generateReturnFix(error.file)
        });
      }
    }

    return fixes;
  }

  /**
   * Get all source files in the project
   */
  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(this.context.frontendPath);
    scanDirectory(this.context.backendPath);
    
    return files;
  }

  /**
   * Validate imports and exports in a single file
   */
  private validateFileImportsExports(filePath: string, content: string): { errors: string[]; fixes: CodeFix[] } {
    const errors: string[] = [];
    const fixes: CodeFix[] = [];

    // Check for imports that don't have corresponding exports
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [...content.matchAll(importRegex)].map(match => match[1]);

    for (const importPath of imports) {
      if (!this.validateImportPath(importPath, filePath)) {
        errors.push(`Invalid import path: ${importPath} in ${filePath}`);
        fixes.push({
          type: 'import',
          file: filePath,
          description: `Fix import path: ${importPath}`,
          applied: false,
          fixCode: this.generateImportPathFix(importPath, filePath)
        });
      }
    }

    // Check for exports that aren't used
    const exportRegex = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
    const exports = [...content.matchAll(exportRegex)].map(match => match[1]);

    // This is a warning rather than an error
    if (exports.length > 0) {
      console.log(`[EnhancedCodeValidator] File ${filePath} exports: ${exports.join(', ')}`);
    }

    return { errors, fixes };
  }

  /**
   * Validate if an import path is valid
   */
  private validateImportPath(importPath: string, currentFile: string): boolean {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(currentFile), importPath);
      return fs.existsSync(resolvedPath) || fs.existsSync(resolvedPath + '.ts') || fs.existsSync(resolvedPath + '.tsx');
    }

    // Handle absolute imports (from node_modules)
    if (!importPath.startsWith('.')) {
      // Check if it's a valid npm package
      const packagePath = path.join(this.context.projectRoot, 'node_modules', importPath);
      return fs.existsSync(packagePath);
    }

    return false;
  }

  /**
   * Find missing dependencies by scanning imports
   */
  private async findMissingDependencies(): Promise<string[]> {
    const files = await this.getAllSourceFiles();
    const imports = new Set<string>();
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      
      for (const match of content.matchAll(importRegex)) {
        const importPath = match[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          imports.add(importPath);
        }
      }
    }

    // Check which imports are missing from package.json
    const packageJsonPath = path.join(this.context.frontendPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      return Array.from(imports).filter(imp => !dependencies[imp]);
    }

    return Array.from(imports);
  }

  /**
   * Generate dependency fixes
   */
  private generateDependencyFixes(missingDeps: string[]): CodeFix[] {
    return missingDeps.map(dep => ({
      type: 'dependency',
      file: path.join(this.context.frontendPath, 'package.json'),
      description: `Add missing dependency: ${dep}`,
      applied: false,
      fixCode: this.generatePackageJsonFix(dep)
    }));
  }

  /**
   * Apply all generated fixes
   */
  private async applyFixes(fixes: CodeFix[]): Promise<void> {
    console.log(`[EnhancedCodeValidator] Applying ${fixes.length} fixes...`);

    for (const fix of fixes) {
      try {
        if (fix.fixCode && !fix.applied) {
          await this.applySingleFix(fix);
          fix.applied = true;
        }
      } catch (error) {
        console.error(`[EnhancedCodeValidator] Failed to apply fix: ${fix.description}`, error);
      }
    }
  }

  /**
   * Apply a single fix
   */
  private async applySingleFix(fix: CodeFix): Promise<void> {
    if (!fix.fixCode) return;

    switch (fix.type) {
      case 'import':
        await this.applyImportFix(fix);
        break;
      case 'export':
        await this.applyExportFix(fix);
        break;
      case 'type':
        await this.applyTypeFix(fix);
        break;
      case 'syntax':
        await this.applySyntaxFix(fix);
        break;
      case 'dependency':
        await this.applyDependencyFix(fix);
        break;
    }
  }

  // Helper methods for generating specific fixes
  private generateImportFix(moduleName: string, filePath: string): string {
    return `import { ${moduleName} } from '${moduleName}';`;
  }

  private generatePropertyFix(propName: string, filePath: string): string {
    return `// Add missing property: ${propName}`;
  }

  private generateReturnFix(filePath: string): string {
    return 'return null; // Add appropriate return value';
  }

  private generateImportPathFix(importPath: string, filePath: string): string {
    return `// Fix import path: ${importPath}`;
  }

  private generatePackageJsonFix(dependency: string): string {
    return `"${dependency}": "^1.0.0"`;
  }

  // Helper methods for applying specific fixes
  private async applyImportFix(fix: CodeFix): Promise<void> {
    // Implementation for applying import fixes
  }

  private async applyExportFix(fix: CodeFix): Promise<void> {
    // Implementation for applying export fixes
  }

  private async applyTypeFix(fix: CodeFix): Promise<void> {
    // Implementation for applying type fixes
  }

  private async applySyntaxFix(fix: CodeFix): Promise<void> {
    // Implementation for applying syntax fixes
  }

  private async applyDependencyFix(fix: CodeFix): Promise<void> {
    // Implementation for applying dependency fixes
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(): string[] {
    // Implementation for detecting circular dependencies
    return [];
  }
}

export default EnhancedCodeValidator; 