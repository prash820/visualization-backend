import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { openai, OPENAI_MODEL } from '../config/aiProvider';

const execAsync = promisify(exec);

// Component-Level Error Isolation (Layer 1)
export class ComponentLevelFixer {
  private componentMetadata: Map<string, ComponentMetadata> = new Map();
  private errorFingerprints: Set<string> = new Set();
  private maxRetriesPerComponent: number = 3;
  private retryCounts: Map<string, number> = new Map();

  constructor(private projectPath: string, private appType: string, private framework: string) {}

  /**
   * Register a component with metadata for tracking
   */
  registerComponent(metadata: ComponentMetadata): void {
    this.componentMetadata.set(metadata.name, metadata);
    console.log(`[ComponentFixer] Registered component: ${metadata.name} at ${metadata.filePath}`);
  }

  /**
   * Run isolated checks for a single component
   */
  async checkComponentIsolation(componentName: string): Promise<ComponentCheckResult> {
    const metadata = this.componentMetadata.get(componentName);
    if (!metadata) {
      throw new Error(`Component ${componentName} not registered`);
    }

    console.log(`[ComponentFixer] Running isolated checks for ${componentName}...`);

    const fullPath = path.join(this.projectPath, metadata.filePath);
    if (!fs.existsSync(fullPath)) {
      return {
        success: false,
        errors: [{
          type: 'FILE_MISSING',
          code: 'FILE_NOT_FOUND',
          message: `Component file not found: ${metadata.filePath}`,
          severity: 'error'
        }],
        warnings: []
      };
    }

    const results = await Promise.all([
      this.runTypeScriptCheck(fullPath),
      this.runESLintCheck(fullPath),
      this.runImportResolutionCheck(fullPath, metadata)
    ]);

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      success: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Fix component errors in isolation
   */
  async fixComponentErrors(componentName: string, errors: ComponentError[]): Promise<ComponentFixResult> {
    const metadata = this.componentMetadata.get(componentName);
    if (!metadata) {
      throw new Error(`Component ${componentName} not registered`);
    }

    const retryCount = this.retryCounts.get(componentName) || 0;
    if (retryCount >= this.maxRetriesPerComponent) {
      console.warn(`[ComponentFixer] Max retries reached for ${componentName}, using fallback`);
      return this.createFallbackComponent(componentName, metadata);
    }

    // Create error fingerprint to avoid retrying same errors
    const errorFingerprint = this.createErrorFingerprint(errors);
    if (this.errorFingerprints.has(errorFingerprint)) {
      console.warn(`[ComponentFixer] Error fingerprint already seen for ${componentName}, using fallback`);
      return this.createFallbackComponent(componentName, metadata);
    }

    this.errorFingerprints.add(errorFingerprint);
    this.retryCounts.set(componentName, retryCount + 1);

    console.log(`[ComponentFixer] Fixing ${errors.length} errors in ${componentName} (attempt ${retryCount + 1})`);

    try {
      const fullPath = path.join(this.projectPath, metadata.filePath);
      const originalCode = fs.readFileSync(fullPath, 'utf8');
      
      const fixPrompt = this.buildComponentFixPrompt(componentName, metadata, errors, originalCode);
      const fixedCode = await this.fixCodeWithAI(fixPrompt, originalCode);
      
      if (fixedCode !== originalCode) {
        fs.writeFileSync(fullPath, fixedCode);
        
        // Verify the fix
        const verificationResult = await this.checkComponentIsolation(componentName);
        
        return {
          success: verificationResult.success,
          errorsFixed: errors.length - verificationResult.errors.length,
          totalErrors: errors.length,
          remainingErrors: verificationResult.errors,
          codeChanged: true,
          fallbackUsed: false
        };
      }

      return {
        success: false,
        errorsFixed: 0,
        totalErrors: errors.length,
        remainingErrors: errors,
        codeChanged: false,
        fallbackUsed: false
      };

    } catch (error) {
      console.error(`[ComponentFixer] Error fixing component ${componentName}:`, error);
      return this.createFallbackComponent(componentName, metadata);
    }
  }

  /**
   * Run TypeScript check on a single file
   */
  private async runTypeScriptCheck(filePath: string): Promise<{ errors: ComponentError[], warnings: ComponentError[] }> {
    const errors: ComponentError[] = [];
    const warnings: ComponentError[] = [];

    try {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      
      const command = `cd "${dir}" && npx tsc --noEmit --pretty false "${fileName}" 2>&1`;
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      const output = stderr || stdout;
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.includes('Found 0 errors')) {
          const parsed = this.parseTypeScriptError(line);
          if (parsed) {
            if (parsed.severity === 'error') {
              errors.push(parsed);
            } else {
              warnings.push(parsed);
            }
          }
        }
      }
    } catch (error: any) {
      // Parse error output from failed command
      const errorOutput = error.stderr || error.message;
      const lines = errorOutput.split('\n');
      
      for (const line of lines) {
        if (line.trim() && line.includes('error TS')) {
          const parsed = this.parseTypeScriptError(line);
          if (parsed) {
            errors.push(parsed);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Run ESLint check on a single file
   */
  private async runESLintCheck(filePath: string): Promise<{ errors: ComponentError[], warnings: ComponentError[] }> {
    const errors: ComponentError[] = [];
    const warnings: ComponentError[] = [];

    try {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      
      const command = `cd "${dir}" && npx eslint --format json "${fileName}" 2>&1`;
      const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
      
      const output = stderr || stdout;
      
      try {
        const eslintResults = JSON.parse(output);
        for (const result of eslintResults) {
          for (const message of result.messages) {
            const componentError: ComponentError = {
              type: 'ESLINT',
              code: message.ruleId || 'ESLINT_ERROR',
              message: message.message,
              line: message.line,
              column: message.column,
              severity: message.severity === 2 ? 'error' : 'warning'
            };
            
            if (componentError.severity === 'error') {
              errors.push(componentError);
            } else {
              warnings.push(componentError);
            }
          }
        }
      } catch (parseError) {
        // If JSON parsing fails, it might be a command error
        if (output.includes('ESLint')) {
          errors.push({
            type: 'ESLINT',
            code: 'ESLINT_COMMAND_ERROR',
            message: output,
            severity: 'error'
          });
        }
      }
    } catch (error: any) {
      // ESLint might not be installed, which is okay
      console.log(`[ComponentFixer] ESLint check skipped for ${filePath}: ${error.message}`);
    }

    return { errors, warnings };
  }

  /**
   * Check import resolution for a component
   */
  private async runImportResolutionCheck(filePath: string, metadata: ComponentMetadata): Promise<{ errors: ComponentError[], warnings: ComponentError[] }> {
    const errors: ComponentError[] = [];
    const warnings: ComponentError[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const importMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/);
        
        if (importMatch) {
          const importPath = importMatch[1];
          const resolvedPath = this.resolveImportPath(importPath, filePath);
          
          if (!resolvedPath || !fs.existsSync(resolvedPath)) {
            errors.push({
              type: 'IMPORT_RESOLUTION',
              code: 'MISSING_MODULE',
              message: `Cannot find module '${importPath}'`,
              line: i + 1,
              column: line.indexOf(importPath),
              severity: 'error'
            });
          }
        }
      }
    } catch (error) {
      console.warn(`[ComponentFixer] Import resolution check failed for ${filePath}:`, error);
    }

    return { errors, warnings };
  }

  /**
   * Parse TypeScript error output
   */
  private parseTypeScriptError(line: string): ComponentError | null {
    const match = line.match(/(.+)\((\d+),(\d+)\):\s*(.+)/);
    if (!match) return null;
    
    const [, filePath, lineNum, column, message] = match;
    
    return {
      type: 'TYPESCRIPT',
      code: this.extractErrorCode(message),
      message: message.trim(),
      line: parseInt(lineNum),
      column: parseInt(column),
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
   * Resolve import path to actual file path
   */
  private resolveImportPath(importPath: string, currentFile: string): string | null {
    const currentDir = path.dirname(currentFile);
    
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(currentDir, importPath);
    }
    
    // Handle absolute imports (like @/components/...)
    if (importPath.startsWith('@/')) {
      const relativePath = importPath.substring(2);
      return path.join(this.projectPath, relativePath);
    }
    
    return null;
  }

  /**
   * Build component-specific fix prompt
   */
  private buildComponentFixPrompt(componentName: string, metadata: ComponentMetadata, errors: ComponentError[], originalCode: string): string {
    const errorDetails = errors.map(error => 
      `Line ${error.line}, Column ${error.column}: ${error.message} (${error.code})`
    ).join('\n');

    return `You previously generated ${componentName}.tsx, but the component has the following errors:

${errorDetails}

**Component Metadata:**
- Name: ${metadata.name}
- File Path: ${metadata.filePath}
- Dependencies: ${metadata.dependencies.join(', ')}
- Props Interface: ${metadata.propsInterface}
- Generation Log: ${metadata.generationLog}

**Current Code:**
\`\`\`typescript
${originalCode}
\`\`\`

**CRITICAL FIXING INSTRUCTIONS:**
1. Fix ALL the errors listed above
2. Ensure all imports resolve correctly
3. Add missing dependencies if they don't exist
4. Fix TypeScript type errors
5. Fix ESLint issues
6. Maintain the component's intended functionality
7. Return ONLY the fixed code

**Common Fixes:**
- Add missing React imports: "import React from 'react';"
- Fix import paths to match actual file structure
- Add proper TypeScript type annotations
- Add missing export statements
- Fix syntax errors (unmatched braces, etc.)

**CRITICAL REQUIREMENTS:**
- Return ONLY the fixed code
- NO markdown formatting
- NO code fences
- NO explanatory text
- Start with the first line of code and end with the last line
- Ensure the code compiles without errors

Return the fixed code:`;
  }

  /**
   * Fix code using AI
   */
  private async fixCodeWithAI(prompt: string, originalCode: string): Promise<string> {
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
      console.error(`[ComponentFixer] AI fix failed:`, error);
      return originalCode;
    }
  }

  /**
   * Create error fingerprint to avoid retrying same errors
   */
  private createErrorFingerprint(errors: ComponentError[]): string {
    const errorSummary = errors.map(error => 
      `${error.type}:${error.code}:${error.message}`
    ).sort().join('|');
    
    return Buffer.from(errorSummary).toString('base64');
  }

  /**
   * Create fallback component when fixing fails
   */
  private createFallbackComponent(componentName: string, metadata: ComponentMetadata): ComponentFixResult {
    const fallbackCode = `import React from 'react';

interface ${metadata.propsInterface} {
  // TODO: Define props interface
}

const ${componentName}: React.FC<${metadata.propsInterface}> = (props) => {
  return (
    <div className="${componentName.toLowerCase()}-fallback">
      <h3>${componentName}</h3>
      <p>TODO: Fix component - generation failed</p>
    </div>
  );
};

export default ${componentName};`;

    const fullPath = path.join(this.projectPath, metadata.filePath);
    fs.writeFileSync(fullPath, fallbackCode);

    console.log(`[ComponentFixer] Created fallback component for ${componentName}`);

    return {
      success: true,
      errorsFixed: 0,
      totalErrors: 0,
      remainingErrors: [],
      codeChanged: true,
      fallbackUsed: true
    };
  }

  /**
   * Get all registered components
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.componentMetadata.keys());
  }

  /**
   * Get component metadata
   */
  getComponentMetadata(componentName: string): ComponentMetadata | undefined {
    return this.componentMetadata.get(componentName);
  }
}

// Types for component-level fixing
export interface ComponentMetadata {
  name: string;
  filePath: string;
  dependencies: string[];
  propsInterface: string;
  generationLog: string;
  category?: 'component' | 'page' | 'layout' | 'utility';
  complexity?: 'low' | 'medium' | 'high';
}

export interface ComponentError {
  type: 'TYPESCRIPT' | 'ESLINT' | 'IMPORT_RESOLUTION' | 'FILE_MISSING' | 'BUILD';
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ComponentCheckResult {
  success: boolean;
  errors: ComponentError[];
  warnings: ComponentError[];
}

export interface ComponentFixResult {
  success: boolean;
  errorsFixed: number;
  totalErrors: number;
  remainingErrors: ComponentError[];
  codeChanged: boolean;
  fallbackUsed: boolean;
} 