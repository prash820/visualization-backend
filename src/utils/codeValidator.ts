import fs from 'fs';
import path from 'path';

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: string[];
  timeTaken: number;
  codeMetrics: {
    totalFiles: number;
    totalLines: number;
    frontendComponents: number;
    backendControllers: number;
    sharedTypes: number;
  };
}

export interface ValidationError {
  type: 'syntax' | 'structure';
  file?: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

export class CodeValidator {
  
  /**
   * Lightweight validation pipeline - syntax and structure checks only
   */
  async validateGeneratedCode(generatedCode: any): Promise<ValidationResult> {
    const startTime = Date.now();
    console.log('[Code Validator] Starting lightweight code validation...');

    try {
      const errors: ValidationError[] = [];
      const warnings: string[] = [];
      
      // Basic structure validation
      const structureValidation = this.validateCodeStructure(generatedCode);
      errors.push(...structureValidation.errors);
      warnings.push(...structureValidation.warnings);

      // Basic syntax validation (static analysis)
      const syntaxValidation = this.validateBasicSyntax(generatedCode);
      errors.push(...syntaxValidation.errors);
      warnings.push(...syntaxValidation.warnings);

      // Calculate metrics
      const codeMetrics = this.calculateCodeMetrics(generatedCode);

      const timeTaken = Date.now() - startTime;
      console.log(`[Code Validator] Lightweight validation completed in ${timeTaken}ms`);
      console.log(`[Code Validator] Found ${errors.length} errors, ${warnings.length} warnings`);

      // Log detailed error information
      if (errors.length > 0) {
        console.log(`[Code Validator] VALIDATION ERRORS:`);
        errors.forEach((error, index) => {
          console.log(`  ${index + 1}. [${error.type.toUpperCase()}] ${error.file ? `${error.file}:${error.line || '?'}` : 'Global'}: ${error.message}`);
        });
      }

      // Log warnings if any
      if (warnings.length > 0) {
        console.log(`[Code Validator] VALIDATION WARNINGS:`);
        warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }

      return {
        success: errors.filter(e => e.severity === 'error').length === 0,
        errors,
        warnings,
        timeTaken,
        codeMetrics
      };

    } catch (error: any) {
      return {
        success: false,
        errors: [{
          type: 'structure',
          message: `Validation error: ${error.message}`,
          severity: 'error' as const
        }],
        warnings: [],
        timeTaken: Date.now() - startTime,
        codeMetrics: {
          totalFiles: 0,
          totalLines: 0,
          frontendComponents: 0,
          backendControllers: 0,
          sharedTypes: 0
        }
      };
    }
  }

  /**
   * Validate basic code structure (has required sections, reasonable content)
   */
  private validateCodeStructure(generatedCode: any): {
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check if we have basic structure
    if (!generatedCode || typeof generatedCode !== 'object') {
      errors.push({
        type: 'structure',
        message: 'Generated code is not a valid object structure',
        severity: 'error'
      });
      return { errors, warnings };
    }

    // Check for at least one of frontend/backend/shared
    const hasFrontend = generatedCode.frontend && Object.keys(generatedCode.frontend).length > 0;
    const hasBackend = generatedCode.backend && Object.keys(generatedCode.backend).length > 0;
    const hasShared = generatedCode.shared && Object.keys(generatedCode.shared).length > 0;

    if (!hasFrontend && !hasBackend && !hasShared) {
      errors.push({
        type: 'structure',
        message: 'Generated code has no frontend, backend, or shared code sections',
        severity: 'error'
      });
    }

    // Validate frontend structure
    if (hasFrontend) {
      const frontendValidation = this.validateSectionStructure('frontend', generatedCode.frontend);
      errors.push(...frontendValidation.errors);
      warnings.push(...frontendValidation.warnings);
    }

    // Validate backend structure
    if (hasBackend) {
      const backendValidation = this.validateSectionStructure('backend', generatedCode.backend);
      errors.push(...backendValidation.errors);
      warnings.push(...backendValidation.warnings);
    }

    // Validate shared structure
    if (hasShared) {
      const sharedValidation = this.validateSectionStructure('shared', generatedCode.shared);
      errors.push(...sharedValidation.errors);
      warnings.push(...sharedValidation.warnings);
    }

    return { errors, warnings };
  }

  /**
   * Validate individual section structure
   */
  private validateSectionStructure(sectionName: string, section: any): {
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!section || typeof section !== 'object') {
      warnings.push(`${sectionName} section is empty or invalid`);
      return { errors, warnings };
    }

    // Check each category in the section
    for (const [categoryName, category] of Object.entries(section)) {
      if (!category || typeof category !== 'object') {
        warnings.push(`${sectionName}.${categoryName} is empty or invalid`);
        continue;
      }

      // Check each file in the category
      for (const [fileName, fileContent] of Object.entries(category)) {
        if (!fileContent || typeof fileContent !== 'string') {
          errors.push({
            type: 'structure',
            file: `${sectionName}/${categoryName}/${fileName}`,
            message: 'File content is empty or not a string',
            severity: 'error'
          });
        } else if (fileContent.trim().length < 10) {
          warnings.push(`File ${sectionName}/${categoryName}/${fileName} has very little content`);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Basic syntax validation using static analysis (no compilation)
   */
  private validateBasicSyntax(generatedCode: any): {
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check all code files for basic syntax issues
    this.traverseCodeFiles(generatedCode, (sectionName, categoryName, fileName, content) => {
      const filePath = `${sectionName}/${categoryName}/${fileName}`;
      
      // Basic syntax checks (no compilation, just pattern matching)
      const syntaxIssues = this.checkBasicSyntaxPatterns(content, filePath);
      errors.push(...syntaxIssues.errors);
      warnings.push(...syntaxIssues.warnings);
    });

    return { errors, warnings };
  }

  /**
   * Check for basic syntax patterns without compilation
   */
  private checkBasicSyntaxPatterns(content: string, filePath: string): {
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Skip import/dependency checks entirely - focus on basic syntax only
    
    // 1. Check for unmatched braces/brackets/parentheses
    const braceMatching = this.checkBraceMatching(content);
    if (!braceMatching.valid) {
      errors.push({
        type: 'syntax',
        file: filePath,
        line: braceMatching.line,
        message: `Unmatched ${braceMatching.type}: ${braceMatching.message}`,
        severity: 'error'
      });
    }

    // 2. Check for unterminated strings
    const stringIssues = this.checkUnterminatedStrings(content);
    errors.push(...stringIssues.map(issue => ({
      type: 'syntax' as const,
      file: filePath,
      line: issue.line,
      message: `Unterminated string: ${issue.message}`,
      severity: 'error' as const
    })));

    // 3. Check for basic function/component structure (TypeScript/React)
    if (filePath.includes('.tsx') || filePath.includes('.ts')) {
      const structureIssues = this.checkBasicTypeScriptStructure(content, filePath);
      warnings.push(...structureIssues);
    }

    return { errors, warnings };
  }

  /**
   * Check for unmatched braces, brackets, and parentheses
   */
  private checkBraceMatching(content: string): {
    valid: boolean;
    type?: string;
    line?: number;
    message?: string;
  } {
    const stack: { char: string; line: number }[] = [];
    const pairs: { [key: string]: string } = { '(': ')', '[': ']', '{': '}' };
    const lines = content.split('\n');
    
    let inString = false;
    let stringChar = '';
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';
        
        // Handle string literals
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
          continue;
        }
        
        if (inString) continue;
        
        // Skip comments
        if (char === '/' && i < line.length - 1 && line[i + 1] === '/') {
          break; // Rest of line is comment
        }
        
        if (char in pairs) {
          stack.push({ char, line: lineNum + 1 });
        } else if (Object.values(pairs).includes(char)) {
          if (stack.length === 0) {
            return {
              valid: false,
              type: char,
              line: lineNum + 1,
              message: `Unexpected closing ${char}`
            };
          }
          
          const last = stack.pop()!;
          if (pairs[last.char] !== char) {
            return {
              valid: false,
              type: char,
              line: lineNum + 1,
              message: `Expected ${pairs[last.char]} but found ${char}`
            };
          }
        }
      }
    }
    
    if (stack.length > 0) {
      const unmatched = stack[stack.length - 1];
      return {
        valid: false,
        type: unmatched.char,
        line: unmatched.line,
        message: `Unmatched opening ${unmatched.char}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Check for unterminated strings
   */
  private checkUnterminatedStrings(content: string): Array<{ line: number; message: string }> {
    const issues: Array<{ line: number; message: string }> = [];
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      let inString = false;
      let stringChar = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';
        
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
          }
        }
      }
      
      if (inString) {
        issues.push({
          line: lineNum + 1,
          message: `Unterminated ${stringChar} string`
        });
      }
    }
    
    return issues;
  }

  /**
   * Check basic TypeScript/React structure
   */
  private checkBasicTypeScriptStructure(content: string, filePath: string): string[] {
    const warnings: string[] = [];
    
    // Check for React component structure
    if (filePath.includes('components/') || filePath.includes('.tsx')) {
      if (!content.includes('React') && content.includes('JSX')) {
        warnings.push(`${filePath}: React component may be missing React import`);
      }
      
      if (!content.includes('export default') && !content.includes('export {')) {
        warnings.push(`${filePath}: Component file may be missing export statement`);
      }
    }
    
    // Check for basic function structure
    const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=|=>\s*{/g) || []).length;
    if (functionCount === 0 && content.length > 50) {
      warnings.push(`${filePath}: File may be missing function definitions`);
    }
    
    return warnings;
  }

  /**
   * Calculate basic code metrics
   */
  private calculateCodeMetrics(generatedCode: any): {
    totalFiles: number;
    totalLines: number;
    frontendComponents: number;
    backendControllers: number;
    sharedTypes: number;
  } {
    let totalFiles = 0;
    let totalLines = 0;
    let frontendComponents = 0;
    let backendControllers = 0;
    let sharedTypes = 0;

    this.traverseCodeFiles(generatedCode, (sectionName, categoryName, fileName, content) => {
      totalFiles++;
      totalLines += content.split('\n').length;
      
      if (sectionName === 'frontend' && categoryName === 'components') {
        frontendComponents++;
      } else if (sectionName === 'backend' && categoryName === 'controllers') {
        backendControllers++;
      } else if (sectionName === 'shared' && (categoryName === 'types' || categoryName === 'interfaces')) {
        sharedTypes++;
      }
    });

    return {
      totalFiles,
      totalLines,
      frontendComponents,
      backendControllers,
      sharedTypes
    };
  }

  /**
   * Helper to traverse all code files
   */
  private traverseCodeFiles(
    generatedCode: any, 
    callback: (sectionName: string, categoryName: string, fileName: string, content: string) => void
  ): void {
    for (const [sectionName, section] of Object.entries(generatedCode)) {
      if (!section || typeof section !== 'object') continue;
      
      for (const [categoryName, category] of Object.entries(section)) {
        if (!category || typeof category !== 'object') continue;
        
        for (const [fileName, content] of Object.entries(category)) {
          if (typeof content === 'string') {
            callback(sectionName, categoryName, fileName, content);
          }
        }
      }
    }
  }
} 