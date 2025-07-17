import fs from 'fs/promises';
import path from 'path';

export interface ConsistencyIssue {
  type: 'import_export_mismatch' | 'method_signature_mismatch' | 'error_handling' | 'lambda_compatibility' | 'type_error';
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  success: boolean;
  issues: ConsistencyIssue[];
  summary: string;
}

/**
 * Validate code consistency across backend files
 */
export async function validateBackendCodeConsistency(projectPath: string): Promise<ValidationResult> {
  const issues: ConsistencyIssue[] = [];
  const backendPath = path.join(projectPath, 'backend');
  
  try {
    // Check if backend directory exists
    await fs.access(backendPath);
  } catch {
    return {
      success: false,
      issues: [{
        type: 'lambda_compatibility',
        file: 'backend',
        message: 'Backend directory not found',
        severity: 'error'
      }],
      summary: 'Backend directory not found'
    };
  }

  // Collect all TypeScript files
  const files = await collectTypeScriptFiles(backendPath);
  
  // Analyze each file for consistency issues
  for (const file of files) {
    const fileIssues = await analyzeFileConsistency(file, files);
    issues.push(...fileIssues);
  }

  // Check for cross-file consistency issues
  const crossFileIssues = await checkCrossFileConsistency(files);
  issues.push(...crossFileIssues);

  const success = issues.filter(issue => issue.severity === 'error').length === 0;
  
  return {
    success,
    issues,
    summary: generateSummary(issues)
  };
}

/**
 * Collect all TypeScript files in the backend directory
 */
async function collectTypeScriptFiles(dir: string, relativePath: string = ''): Promise<Array<{ path: string; content: string; relativePath: string }>> {
  const files: Array<{ path: string; content: string; relativePath: string }> = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const fileRelativePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        const subFiles = await collectTypeScriptFiles(fullPath, fileRelativePath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ path: fullPath, content, relativePath: fileRelativePath });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be accessed
  }
  
  return files;
}

/**
 * Analyze a single file for consistency issues
 */
async function analyzeFileConsistency(file: { path: string; content: string; relativePath: string }, allFiles: Array<{ path: string; content: string; relativePath: string }>): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];
  const lines = file.content.split('\n');
  
  // Check for error handling patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for catch blocks without proper typing
    if (line.includes('catch (error)') && !line.includes('catch (error: any)')) {
      issues.push({
        type: 'error_handling',
        file: file.relativePath,
        line: i + 1,
        message: 'Catch block should use "catch (error: any)" to avoid TypeScript errors',
        severity: 'error'
      });
    }
    
    // Check for error.message access without proper typing
    if (line.includes('error.message') && !line.includes('error: any')) {
      issues.push({
        type: 'error_handling',
        file: file.relativePath,
        line: i + 1,
        message: 'Accessing error.message requires "error: any" typing',
        severity: 'error'
      });
    }
  }
  
  // Check for Lambda compatibility issues
  if (file.relativePath.includes('index.ts') || file.relativePath.includes('server.ts')) {
    if (file.content.includes('app.listen(')) {
      issues.push({
        type: 'lambda_compatibility',
        file: file.relativePath,
        message: 'Lambda functions should not use app.listen(), use serverless-http instead',
        severity: 'error'
      });
    }
    
    if (!file.content.includes('serverless-http')) {
      issues.push({
        type: 'lambda_compatibility',
        file: file.relativePath,
        message: 'Lambda entry point should use serverless-http',
        severity: 'warning'
      });
    }
  }
  
  // Check for import/export consistency
  const importExportIssues = checkImportExportConsistency(file, allFiles);
  issues.push(...importExportIssues);
  
  return issues;
}

/**
 * Check import/export consistency
 */
function checkImportExportConsistency(file: { path: string; content: string; relativePath: string }, allFiles: Array<{ path: string; content: string; relativePath: string }>): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  
  // Extract imports
  const importRegex = /import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(file.content)) !== null) {
    const importStatement = match[1];
    const importPath = match[2];
    
    // Find the imported file
    const importedFile = allFiles.find(f => {
      const fileName = f.relativePath.replace('.ts', '');
      return importPath.includes(fileName) || importPath.endsWith(fileName);
    });
    
    if (importedFile) {
      // Check if the import matches the export
      const exportIssues = validateImportAgainstExport(importStatement, importedFile, file.relativePath);
      issues.push(...exportIssues);
    }
  }
  
  return issues;
}

/**
 * Validate import statement against the actual exports
 */
function validateImportAgainstExport(importStatement: string, exportedFile: { path: string; content: string; relativePath: string }, importingFile: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  
  // Extract what's being imported
  const importedItems = importStatement
    .replace(/\{([^}]+)\}/, '$1') // Remove braces for named imports
    .replace(/\s+as\s+\w+/, '') // Remove "as" aliases
    .split(',')
    .map(item => item.trim());
  
  // Check for default exports
  if (importStatement.includes('import') && !importStatement.includes('{') && !importStatement.includes('*')) {
    // This is a default import
    const hasDefaultExport = exportedFile.content.includes('export default');
    if (!hasDefaultExport) {
      issues.push({
        type: 'import_export_mismatch',
        file: importingFile,
        message: `Default import "${importedItems[0]}" but "${exportedFile.relativePath}" has no default export`,
        severity: 'error'
      });
    }
  }
  
  // Check for named exports
  if (importStatement.includes('{')) {
    for (const item of importedItems) {
      const hasNamedExport = exportedFile.content.includes(`export ${item}`) || 
                            exportedFile.content.includes(`export class ${item}`) ||
                            exportedFile.content.includes(`export function ${item}`);
      
      if (!hasNamedExport) {
        issues.push({
          type: 'import_export_mismatch',
          file: importingFile,
          message: `Named import "${item}" not found in "${exportedFile.relativePath}"`,
          severity: 'error'
        });
      }
    }
  }
  
  return issues;
}

/**
 * Check for cross-file consistency issues
 */
async function checkCrossFileConsistency(files: Array<{ path: string; content: string; relativePath: string }>): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];
  
  // Check for method signature consistency between services and controllers
  const serviceFiles = files.filter(f => f.relativePath.includes('services/'));
  const controllerFiles = files.filter(f => f.relativePath.includes('controllers/') || f.relativePath.includes('routes/'));
  
  for (const controllerFile of controllerFiles) {
    for (const serviceFile of serviceFiles) {
      const methodIssues = checkMethodSignatureConsistency(controllerFile, serviceFile);
      issues.push(...methodIssues);
    }
  }
  
  return issues;
}

/**
 * Check method signature consistency between controller and service
 */
function checkMethodSignatureConsistency(controllerFile: { path: string; content: string; relativePath: string }, serviceFile: { path: string; content: string; relativePath: string }): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  
  // Extract method calls from controller
  const methodCallRegex = /(\w+)\.(\w+)\(/g;
  let match;
  
  while ((match = methodCallRegex.exec(controllerFile.content)) !== null) {
    const serviceName = match[1];
    const methodName = match[2];
    
    // Check if this service name matches the service file
    const serviceFileName = serviceFile.relativePath.split('/').pop()?.replace('.ts', '');
    if (serviceFileName && serviceName.toLowerCase().includes(serviceFileName.toLowerCase())) {
      // Check if the method exists in the service
      const methodExists = serviceFile.content.includes(`async ${methodName}(`) || 
                          serviceFile.content.includes(`${methodName}(`) ||
                          serviceFile.content.includes(`public ${methodName}(`);
      
      if (!methodExists) {
        issues.push({
          type: 'method_signature_mismatch',
          file: controllerFile.relativePath,
          message: `Method "${methodName}" called on "${serviceName}" but not found in "${serviceFile.relativePath}"`,
          severity: 'error'
        });
      }
    }
  }
  
  return issues;
}

/**
 * Generate a summary of validation results
 */
function generateSummary(issues: ConsistencyIssue[]): string {
  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;
  
  if (errorCount === 0 && warningCount === 0) {
    return '✅ All consistency checks passed';
  }
  
  let summary = `Found ${errorCount} errors and ${warningCount} warnings:\n`;
  
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  
  if (errors.length > 0) {
    summary += '\nErrors:\n';
    errors.forEach(error => {
      summary += `  - ${error.file}: ${error.message}\n`;
    });
  }
  
  if (warnings.length > 0) {
    summary += '\nWarnings:\n';
    warnings.forEach(warning => {
      summary += `  - ${warning.file}: ${warning.message}\n`;
    });
  }
  
  return summary;
} 