import { ValidationResult, ValidationError, CodeValidator } from './codeValidator';

export interface AutoFixResult {
  success: boolean;
  fixesApplied: Fix[];
  validationResult: ValidationResult;
  attemptsUsed: number;
  maxAttemptsReached: boolean;
  fixedCode: any;
}

export interface Fix {
  type: 'syntax_fix' | 'structure_fix' | 'basic_template';
  description: string;
  filesAffected: string[];
  errorFixed: string;
}

export class CodeAutoFixer {
  private maxRetryAttempts: number = 2; // Reduced since we're doing lighter validation
  private validator: CodeValidator;

  constructor() {
    this.validator = new CodeValidator();
  }

  /**
   * Simplified auto-fix pipeline for lightweight validation
   */
  async autoFixAndValidate(generatedCode: any): Promise<AutoFixResult> {
    console.log('[Code Auto-Fixer] Starting lightweight auto-fix pipeline...');
    
    let currentCode = { ...generatedCode };
    let attempts = 0;
    const fixesApplied: Fix[] = [];
    
    while (attempts < this.maxRetryAttempts) {
      attempts++;
      console.log(`[Code Auto-Fixer] Validation attempt ${attempts}/${this.maxRetryAttempts}`);
      
      // Run lightweight validation
      const validationResult = await this.validator.validateGeneratedCode(currentCode);
      
      if (validationResult.success) {
        console.log(`[Code Auto-Fixer] Validation successful after ${attempts} attempts`);
        return {
          success: true,
          fixesApplied,
          validationResult,
          attemptsUsed: attempts,
          maxAttemptsReached: false,
          fixedCode: currentCode
        };
      }
      
      // Attempt to fix only the issues we can reasonably fix
      console.log(`[Code Auto-Fixer] Found ${validationResult.errors.length} errors, attempting lightweight fixes...`);
      
      // Log the specific errors found
      if (validationResult.errors.length > 0) {
        console.log(`[Code Auto-Fixer] ERRORS TO FIX:`);
        validationResult.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. [${error.type.toUpperCase()}] ${error.file ? `${error.file}:${error.line || '?'}` : 'Global'}: ${error.message}`);
        });
      }
      
      const fixAttempt = await this.attemptLightweightFixes(currentCode, validationResult.errors);
      
      if (fixAttempt.success) {
        currentCode = fixAttempt.fixedCode;
        fixesApplied.push(...fixAttempt.fixesApplied);
        console.log(`[Code Auto-Fixer] Applied ${fixAttempt.fixesApplied.length} fixes`);
        
        // Log what was fixed
        fixAttempt.fixesApplied.forEach((fix, index) => {
          console.log(`  Fix ${index + 1}: ${fix.description} (${fix.filesAffected.length} files affected)`);
        });
      } else {
        console.log(`[Code Auto-Fixer] No fixable errors found - remaining issues require manual attention`);
        break;
      }
    }
    
    // Final validation result
    const finalValidation = await this.validator.validateGeneratedCode(currentCode);
    
    return {
      success: finalValidation.success,
      fixesApplied,
      validationResult: finalValidation,
      attemptsUsed: attempts,
      maxAttemptsReached: attempts >= this.maxRetryAttempts,
      fixedCode: currentCode
    };
  }

  /**
   * Attempt lightweight fixes - only basic syntax and structure issues
   */
  private async attemptLightweightFixes(code: any, errors: ValidationError[]): Promise<{
    success: boolean;
    fixedCode: any;
    fixesApplied: Fix[];
  }> {
    let fixedCode = { ...code };
    const fixesApplied: Fix[] = [];
    let anyFixApplied = false;

    // Separate error types
    const syntaxErrors = errors.filter(e => e.type === 'syntax');
    const structureErrors = errors.filter(e => e.type === 'structure');

    console.log(`[Code Auto-Fixer] Syntax errors: ${syntaxErrors.length}, Structure errors: ${structureErrors.length}`);

    // Fix 1: Basic syntax errors (unmatched braces, unterminated strings)
    if (syntaxErrors.length > 0) {
      const syntaxFix = this.fixBasicSyntaxIssues(fixedCode, syntaxErrors);
      if (syntaxFix.success) {
        fixedCode = syntaxFix.fixedCode;
        fixesApplied.push(...syntaxFix.fixesApplied);
        anyFixApplied = true;
      }
    }

    // Fix 2: Structure errors (missing content, invalid structure)
    if (structureErrors.length > 0) {
      const structureFix = this.fixBasicStructureIssues(fixedCode, structureErrors);
      if (structureFix.success) {
        fixedCode = structureFix.fixedCode;
        fixesApplied.push(...structureFix.fixesApplied);
        anyFixApplied = true;
      }
    }

    return {
      success: anyFixApplied,
      fixedCode,
      fixesApplied
    };
  }

  /**
   * Fix basic syntax issues like unmatched braces and unterminated strings
   */
  private fixBasicSyntaxIssues(code: any, errors: ValidationError[]): {
    success: boolean;
    fixedCode: any;
    fixesApplied: Fix[];
  } {
    console.log('[Code Auto-Fixer] Attempting to fix basic syntax issues...');

    const fixedCode = { ...code };
    const fixesApplied: Fix[] = [];
    let anyFixed = false;

    // Process each syntax error
    this.traverseCodeFiles(fixedCode, (sectionName, categoryName, fileName, content) => {
      const filePath = `${sectionName}/${categoryName}/${fileName}`;
      const fileErrors = errors.filter(e => e.file === filePath);
      
      if (fileErrors.length === 0) return;

      let fixedContent = content;
      let fileFixed = false;

      for (const error of fileErrors) {
        if (error.message.includes('Unmatched') || error.message.includes('Unexpected closing')) {
          // Try to fix unmatched braces/brackets
          const braceFix = this.fixUnmatchedBraces(fixedContent);
          if (braceFix.fixed) {
            fixedContent = braceFix.content;
            fileFixed = true;
          }
        }
        
        if (error.message.includes('Unterminated string')) {
          // Try to fix unterminated strings
          const stringFix = this.fixUnterminatedStrings(fixedContent);
          if (stringFix.fixed) {
            fixedContent = stringFix.content;
            fileFixed = true;
          }
        }
      }

      if (fileFixed) {
        // Update the file content in the structure
        if (!fixedCode[sectionName]) fixedCode[sectionName] = {};
        if (!fixedCode[sectionName][categoryName]) fixedCode[sectionName][categoryName] = {};
        fixedCode[sectionName][categoryName][fileName] = fixedContent;
        anyFixed = true;
      }
    });

    if (anyFixed) {
      fixesApplied.push({
        type: 'syntax_fix',
        description: 'Fixed basic syntax issues (unmatched braces, unterminated strings)',
        filesAffected: errors.map(e => e.file || 'unknown').filter(f => f !== 'unknown'),
        errorFixed: 'Basic syntax errors'
      });
    }

    return {
      success: anyFixed,
      fixedCode,
      fixesApplied
    };
  }

  /**
   * Fix basic structure issues like empty content or missing sections
   */
  private fixBasicStructureIssues(code: any, errors: ValidationError[]): {
    success: boolean;
    fixedCode: any;
    fixesApplied: Fix[];
  } {
    console.log('[Code Auto-Fixer] Attempting to fix basic structure issues...');

    const fixedCode = { ...code };
    const fixesApplied: Fix[] = [];
    let anyFixed = false;

    for (const error of errors) {
      if (error.message.includes('empty or not a string') && error.file) {
        // Fix empty file content
        const filePath = error.file;
        const pathParts = filePath.split('/');
        
        if (pathParts.length === 3) {
          const [sectionName, categoryName, fileName] = pathParts;
          
          // Ensure structure exists
          if (!fixedCode[sectionName]) fixedCode[sectionName] = {};
          if (!fixedCode[sectionName][categoryName]) fixedCode[sectionName][categoryName] = {};
          
          // Add basic content based on file type and location
          const basicContent = this.generateBasicFileContent(sectionName, categoryName, fileName);
          fixedCode[sectionName][categoryName][fileName] = basicContent;
          anyFixed = true;
        }
      }
      
      if (error.message.includes('no frontend, backend, or shared code sections')) {
        // Add basic structure if completely missing
        if (!fixedCode.frontend) fixedCode.frontend = { components: {} };
        if (!fixedCode.backend) fixedCode.backend = { controllers: {} };
        if (!fixedCode.shared) fixedCode.shared = { types: {} };
        anyFixed = true;
      }
    }

    if (anyFixed) {
      fixesApplied.push({
        type: 'structure_fix',
        description: 'Fixed basic structure issues (empty content, missing sections)',
        filesAffected: errors.map(e => e.file || 'structure').filter(f => f !== 'structure'),
        errorFixed: 'Basic structure errors'
      });
    }

    return {
      success: anyFixed,
      fixedCode,
      fixesApplied
    };
  }

  /**
   * Attempt to fix unmatched braces by adding missing closing braces
   */
  private fixUnmatchedBraces(content: string): { fixed: boolean; content: string } {
    const lines = content.split('\n');
    let braceBalance = 0;
    let bracketBalance = 0;
    let parenBalance = 0;
    
    let inString = false;
    let stringChar = '';
    
    // Count unmatched braces
    for (const line of lines) {
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';
        
        // Handle strings
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
        
        // Count braces outside strings
        if (char === '{') braceBalance++;
        else if (char === '}') braceBalance--;
        else if (char === '[') bracketBalance++;
        else if (char === ']') bracketBalance--;
        else if (char === '(') parenBalance++;
        else if (char === ')') parenBalance--;
      }
    }
    
    // Add missing closing characters if needed
    let fixedContent = content;
    let fixed = false;
    
    if (braceBalance > 0) {
      fixedContent += '\n' + '}'.repeat(braceBalance);
      fixed = true;
    }
    if (bracketBalance > 0) {
      fixedContent += ']'.repeat(bracketBalance);
      fixed = true;
    }
    if (parenBalance > 0) {
      fixedContent += ')'.repeat(parenBalance);
      fixed = true;
    }
    
    return { fixed, content: fixedContent };
  }

  /**
   * Attempt to fix unterminated strings
   */
  private fixUnterminatedStrings(content: string): { fixed: boolean; content: string } {
    const lines = content.split('\n');
    let fixed = false;
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      let line = lines[lineNum];
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
      
      // If string is still open at end of line, close it
      if (inString) {
        lines[lineNum] = line + stringChar;
        fixed = true;
      }
    }
    
    return { fixed, content: lines.join('\n') };
  }

  /**
   * Generate basic content for empty files
   */
  private generateBasicFileContent(sectionName: string, categoryName: string, fileName: string): string {
    // Generate appropriate basic content based on file location
    if (sectionName === 'frontend') {
      if (categoryName === 'components') {
        return `import React from 'react';

interface ${fileName}Props {
  // Add props here
}

const ${fileName}: React.FC<${fileName}Props> = (props) => {
  return (
    <div>
      <h1>${fileName} Component</h1>
      {/* Add component content here */}
    </div>
  );
};

export default ${fileName};`;
      } else if (categoryName === 'services') {
        return `// ${fileName} Service
export const ${fileName.toLowerCase()}Service = {
  // Add service methods here
};

export default ${fileName.toLowerCase()}Service;`;
      }
    } else if (sectionName === 'backend') {
      if (categoryName === 'controllers') {
        return `import { Request, Response } from 'express';

export const ${fileName.toLowerCase()}Controller = {
  // Add controller methods here
  async get(req: Request, res: Response) {
    res.json({ message: '${fileName} controller working' });
  }
};

export default ${fileName.toLowerCase()}Controller;`;
      } else if (categoryName === 'services') {
        return `// ${fileName} Service
export class ${fileName}Service {
  // Add service methods here
}

export default ${fileName}Service;`;
      }
    } else if (sectionName === 'shared') {
      if (categoryName === 'types' || categoryName === 'interfaces') {
        return `// ${fileName} Types and Interfaces
export interface ${fileName}Type {
  id: string;
  // Add properties here
}

export default ${fileName}Type;`;
      }
    }

    // Generic fallback
    return `// ${fileName}
// TODO: Add implementation
export default {};`;
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