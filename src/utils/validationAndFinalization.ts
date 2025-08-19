/**
 * Phase 5: Validation and Finalization
 * 
 * This module handles comprehensive validation, error fixing, and finalization
 * of generated code to ensure it's production-ready and deployable.
 */

import { InfrastructureContext } from '../types/infrastructure';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import { runAgenticErrorFixing, ErrorFixSession } from './agenticErrorFixer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixes: ValidationFix[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'syntax' | 'type' | 'import' | 'dependency' | 'infrastructure' | 'security' | 'performance';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'best_practice' | 'performance' | 'security' | 'maintainability';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface ValidationFix {
  type: 'auto' | 'semi_auto' | 'manual';
  file: string;
  description: string;
  applied: boolean;
  originalCode?: string;
  fixedCode?: string;
  error?: string;
}

export interface ValidationSummary {
  totalFiles: number;
  totalErrors: number;
  totalWarnings: number;
  totalFixes: number;
  successRate: number;
  validationTime: number;
  filesWithErrors: string[];
  criticalErrors: ValidationError[];
}

export interface FinalizationResult {
  success: boolean;
  validatedCode: ValidationResult;
  buildResult: BuildResult;
  testResult: TestResult;
  deploymentReady: boolean;
  deploymentConfig: DeploymentConfig;
  errorFixSession?: ErrorFixSession; // Added for agentic error fixing results
  error?: string;
}

export interface BuildResult {
  success: boolean;
  buildTime: number;
  output?: string;
  errors: string[];
  warnings: string[];
}

export interface TestResult {
  success: boolean;
  testTime: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage?: number;
  errors: string[];
}

export interface DeploymentConfig {
  environment: Record<string, string>;
  buildScript: string;
  startScript: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

/**
 * Validate and finalize generated code
 */
export async function validateAndFinalizeCode(
  projectPath: string,
  infrastructureContext: InfrastructureContext,
  jobId: string
): Promise<FinalizationResult> {
  console.log(`[ValidationAndFinalization] Starting validation and finalization for ${projectPath}`);
  
  const startTime = Date.now();
  
  try {
    // Step 1: Comprehensive Code Validation
    console.log(`[ValidationAndFinalization] Step 1: Running comprehensive code validation...`);
    const validationResult = await runComprehensiveValidation(projectPath, infrastructureContext, jobId);
    
    // Step 2: Agentic Error Detection and Fixing (NEW)
    console.log(`[ValidationAndFinalization] Step 2: Running agentic error detection and fixing...`);
    const errorFixSession = await runAgenticErrorFixing(projectPath, infrastructureContext, jobId);
    
    // Step 3: Auto-fix Validation Errors (Legacy - now enhanced by agentic system)
    console.log(`[ValidationAndFinalization] Step 3: Running enhanced auto-fix for remaining errors...`);
    const fixedValidationResult = await autoFixValidationErrors(validationResult, projectPath, jobId);
    
    // Step 4: Build Validation
    console.log(`[ValidationAndFinalization] Step 4: Running build validation...`);
    const buildResult = await validateBuild(projectPath, jobId);
    
    // Step 5: Test Validation
    console.log(`[ValidationAndFinalization] Step 5: Running test validation...`);
    const testResult = await validateTests(projectPath, jobId);
    
    // Step 6: Generate Deployment Configuration
    console.log(`[ValidationAndFinalization] Step 6: Generating deployment configuration...`);
    const deploymentConfig = await generateDeploymentConfig(projectPath, infrastructureContext, jobId);
    
    // Step 7: Final Quality Check
    console.log(`[ValidationAndFinalization] Step 7: Running final quality check...`);
    const finalQualityCheck = await runFinalQualityCheck(projectPath, fixedValidationResult, buildResult, testResult, jobId);
    
    const totalTime = Date.now() - startTime;
    
    return {
      success: finalQualityCheck.success,
      validatedCode: fixedValidationResult,
      buildResult,
      testResult,
      deploymentReady: finalQualityCheck.success && buildResult.success,
      deploymentConfig,
      errorFixSession, // Include agentic error fixing results
      error: finalQualityCheck.success ? undefined : finalQualityCheck.error
    };
    
  } catch (error: any) {
    console.error(`[ValidationAndFinalization] Error during validation and finalization: ${error.message}`);
    return {
      success: false,
      validatedCode: {
        success: false,
        errors: [{ type: 'syntax', severity: 'error', file: 'unknown', message: error.message }],
        warnings: [],
        fixes: [],
        summary: {
          totalFiles: 0,
          totalErrors: 1,
          totalWarnings: 0,
          totalFixes: 0,
          successRate: 0,
          validationTime: Date.now() - startTime,
          filesWithErrors: [],
          criticalErrors: []
        }
      },
      buildResult: { success: false, buildTime: 0, errors: [error.message], warnings: [] },
      testResult: { success: false, testTime: 0, passed: 0, failed: 1, skipped: 0, errors: [error.message] },
      deploymentReady: false,
      deploymentConfig: {} as DeploymentConfig,
      error: error.message
    };
  }
}

/**
 * Run comprehensive code validation
 */
async function runComprehensiveValidation(
  projectPath: string,
  infrastructureContext: InfrastructureContext,
  jobId: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const fixes: ValidationFix[] = [];
  
  try {
    // Get all TypeScript/JavaScript files
    const files = await getAllSourceFiles(projectPath);
    
    for (const file of files) {
      // Syntax validation
      const syntaxErrors = await validateSyntax(file, jobId);
      errors.push(...syntaxErrors);
      
      // Type validation
      const typeErrors = await validateTypes(file, jobId);
      errors.push(...typeErrors);
      
      // Import validation
      const importErrors = await validateImports(file, projectPath, jobId);
      errors.push(...importErrors);
      
      // Infrastructure validation
      const infraErrors = await validateInfrastructure(file, infrastructureContext, jobId);
      errors.push(...infraErrors);
      
      // Security validation
      const securityWarnings = await validateSecurity(file, jobId);
      warnings.push(...securityWarnings);
      
      // Performance validation
      const performanceWarnings = await validatePerformance(file, jobId);
      warnings.push(...performanceWarnings);
    }
    
    // Dependency validation
    const dependencyErrors = await validateDependencies(projectPath, jobId);
    errors.push(...dependencyErrors);
    
    // Project structure validation
    const structureWarnings = await validateProjectStructure(projectPath, jobId);
    warnings.push(...structureWarnings);
    
    const totalFiles = files.length;
    const totalErrors = errors.length;
    const totalWarnings = warnings.length;
    const successRate = totalFiles > 0 ? ((totalFiles - errors.filter(e => e.severity === 'error').length) / totalFiles) * 100 : 100;
    
    return {
      success: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      fixes,
      summary: {
        totalFiles,
        totalErrors,
        totalWarnings,
        totalFixes: fixes.length,
        successRate,
        validationTime: 0,
        filesWithErrors: [...new Set(errors.map(e => e.file))],
        criticalErrors: errors.filter(e => e.severity === 'error')
      }
    };
    
  } catch (error: any) {
    console.error(`[ValidationAndFinalization] Error during comprehensive validation: ${error.message}`);
    return {
      success: false,
      errors: [{ type: 'syntax', severity: 'error', file: 'validation', message: error.message }],
      warnings: [],
      fixes: [],
      summary: {
        totalFiles: 0,
        totalErrors: 1,
        totalWarnings: 0,
        totalFixes: 0,
        successRate: 0,
        validationTime: 0,
        filesWithErrors: [],
        criticalErrors: []
      }
    };
  }
}

/**
 * Auto-fix validation errors
 */
async function autoFixValidationErrors(
  validationResult: ValidationResult,
  projectPath: string,
  jobId: string
): Promise<ValidationResult> {
  const fixes: ValidationFix[] = [];
  const remainingErrors: ValidationError[] = [];
  
  for (const error of validationResult.errors) {
    try {
      const fix = await generateAutoFix(error, projectPath, jobId);
      if (fix && fix.type === 'auto') {
        // Apply the fix
        const success = await applyFix(fix, projectPath, jobId);
        if (success) {
          fixes.push({ ...fix, applied: true });
        } else {
          fixes.push({ ...fix, applied: false, error: 'Failed to apply fix' });
          remainingErrors.push(error);
        }
      } else if (fix && fix.type === 'semi_auto') {
        fixes.push({ ...fix, applied: false });
        remainingErrors.push(error);
      } else {
        remainingErrors.push(error);
      }
    } catch (fixError: any) {
      console.warn(`[ValidationAndFinalization] Failed to generate fix for error: ${error.message}`, fixError);
      remainingErrors.push(error);
    }
  }
  
  return {
    ...validationResult,
    errors: remainingErrors,
    fixes,
    summary: {
      ...validationResult.summary,
      totalErrors: remainingErrors.length,
      totalFixes: fixes.length
    }
  };
}

/**
 * Validate build process
 */
async function validateBuild(projectPath: string, jobId: string): Promise<BuildResult> {
  const startTime = Date.now();
  
  try {
    // Check if package.json exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
    
    if (!packageJsonExists) {
      return {
        success: false,
        buildTime: Date.now() - startTime,
        errors: ['No package.json found in project'],
        warnings: []
      };
    }
    
    // Try to install dependencies
    try {
      await execAsync('npm install', { cwd: projectPath });
    } catch (installError: any) {
      return {
        success: false,
        buildTime: Date.now() - startTime,
        errors: [`Failed to install dependencies: ${installError.message}`],
        warnings: []
      };
    }
    
    // Try to build the project
    try {
      const { stdout, stderr } = await execAsync('npm run build', { cwd: projectPath });
      return {
        success: true,
        buildTime: Date.now() - startTime,
        output: stdout,
        errors: [],
        warnings: stderr ? [stderr] : []
      };
    } catch (buildError: any) {
      return {
        success: false,
        buildTime: Date.now() - startTime,
        errors: [`Build failed: ${buildError.message}`],
        warnings: []
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      buildTime: Date.now() - startTime,
      errors: [`Build validation failed: ${error.message}`],
      warnings: []
    };
  }
}

/**
 * Validate tests
 */
async function validateTests(projectPath: string, jobId: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Check if test scripts exist
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    if (!packageJson.scripts || !packageJson.scripts.test) {
      return {
        success: true, // No tests is not a failure
        testTime: Date.now() - startTime,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: []
      };
    }
    
    // Run tests
    try {
      const { stdout, stderr } = await execAsync('npm test', { cwd: projectPath });
      
      // Parse test output (simplified)
      const testOutput = stdout + stderr;
      const passed = (testOutput.match(/✓|passed|PASS/g) || []).length;
      const failed = (testOutput.match(/✗|failed|FAIL/g) || []).length;
      const skipped = (testOutput.match(/skipped|SKIP/g) || []).length;
      
      return {
        success: failed === 0,
        testTime: Date.now() - startTime,
        passed,
        failed,
        skipped,
        errors: failed > 0 ? [stderr] : []
      };
    } catch (testError: any) {
      return {
        success: false,
        testTime: Date.now() - startTime,
        passed: 0,
        failed: 1,
        skipped: 0,
        errors: [`Test execution failed: ${testError.message}`]
      };
    }
    
  } catch (error: any) {
    return {
      success: false,
      testTime: Date.now() - startTime,
      passed: 0,
      failed: 1,
      skipped: 0,
      errors: [`Test validation failed: ${error.message}`]
    };
  }
}

/**
 * Generate deployment configuration
 */
async function generateDeploymentConfig(
  projectPath: string,
  infrastructureContext: InfrastructureContext,
  jobId: string
): Promise<DeploymentConfig> {
  try {
    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Generate environment variables
    const environment = {
      NODE_ENV: 'production',
      DATABASE_URL: infrastructureContext.databaseUrl || 'process.env.DATABASE_URL',
      API_GATEWAY_URL: infrastructureContext.apiGatewayUrl || 'process.env.API_GATEWAY_URL',
      S3_BUCKET_NAME: infrastructureContext.s3BucketName || 'process.env.S3_BUCKET_NAME',
      DYNAMODB_TABLE_NAME: infrastructureContext.dynamoDbTableName || 'process.env.DYNAMODB_TABLE_NAME',
      REDIS_ENDPOINT: infrastructureContext.redisEndpoint || 'process.env.REDIS_ENDPOINT',
      COGNITO_USER_POOL_ID: infrastructureContext.cognitoUserPoolId || 'process.env.COGNITO_USER_POOL_ID',
      COGNITO_CLIENT_ID: infrastructureContext.cognitoClientId || 'process.env.COGNITO_CLIENT_ID',
      AWS_REGION: 'us-east-1',
      PORT: '3000'
    };
    
    return {
      environment,
      buildScript: packageJson.scripts?.build || 'tsc',
      startScript: packageJson.scripts?.start || 'node dist/index.js',
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      scripts: packageJson.scripts || {}
    };
    
  } catch (error: any) {
    console.error(`[ValidationAndFinalization] Error generating deployment config: ${error.message}`);
    return {
      environment: {},
      buildScript: 'tsc',
      startScript: 'node dist/index.js',
      dependencies: [],
      devDependencies: [],
      scripts: {}
    };
  }
}

/**
 * Run final quality check
 */
async function runFinalQualityCheck(
  projectPath: string,
  validationResult: ValidationResult,
  buildResult: BuildResult,
  testResult: TestResult,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if validation passed
    if (!validationResult.success) {
      const criticalErrors = validationResult.errors.filter(e => e.severity === 'error');
      if (criticalErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed with ${criticalErrors.length} critical errors`
        };
      }
    }
    
    // Check if build passed
    if (!buildResult.success) {
      return {
        success: false,
        error: `Build failed: ${buildResult.errors.join(', ')}`
      };
    }
    
    // Check if tests passed (if any were run)
    if (testResult.failed > 0) {
      return {
        success: false,
        error: `${testResult.failed} tests failed`
      };
    }
    
    // Check project structure
    const structureValid = await validateFinalProjectStructure(projectPath, jobId);
    if (!structureValid) {
      return {
        success: false,
        error: 'Project structure validation failed'
      };
    }
    
    return { success: true };
    
  } catch (error: any) {
    return {
      success: false,
      error: `Final quality check failed: ${error.message}`
    };
  }
}

// Helper functions for validation

async function getAllSourceFiles(projectPath: string): Promise<string[]> {
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
  
  await scanDirectory(projectPath);
  return files;
}

async function validateSyntax(file: string, jobId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  try {
    const content = await fs.readFile(file, 'utf-8');
    
    // Basic syntax validation using AI
    const prompt = `Validate the TypeScript/JavaScript syntax of this code and return only JSON array of errors:

\`\`\`typescript
${content}
\`\`\`

Return format:
[
  {
    "type": "syntax",
    "severity": "error",
    "line": 10,
    "column": 5,
    "message": "Unexpected token",
    "code": "const x = ;"
  }
]

If no errors, return empty array [].`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || '[]';
    const syntaxErrors = JSON.parse(result);
    
    return syntaxErrors.map((error: any) => ({
      ...error,
      file,
      type: 'syntax' as const
    }));
    
  } catch (error: any) {
    return [{
      type: 'syntax',
      severity: 'error',
      file,
      message: `Failed to validate syntax: ${error.message}`
    }];
  }
}

async function validateTypes(file: string, jobId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  try {
    const content = await fs.readFile(file, 'utf-8');
    
    // Type validation using AI
    const prompt = `Check for TypeScript type errors in this code and return only JSON array of errors:

\`\`\`typescript
${content}
\`\`\`

Return format:
[
  {
    "type": "type",
    "severity": "error",
    "line": 15,
    "column": 10,
    "message": "Type 'string' is not assignable to type 'number'",
    "code": "const x: number = 'string';"
  }
]

If no errors, return empty array [].`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || '[]';
    const typeErrors = JSON.parse(result);
    
    return typeErrors.map((error: any) => ({
      ...error,
      file,
      type: 'type' as const
    }));
    
  } catch (error: any) {
    return [{
      type: 'type',
      severity: 'error',
      file,
      message: `Failed to validate types: ${error.message}`
    }];
  }
}

async function validateImports(file: string, projectPath: string, jobId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  try {
    const content = await fs.readFile(file, 'utf-8');
    
    // Import validation using AI
    const prompt = `Check for import/export errors in this code and return only JSON array of errors:

\`\`\`typescript
${content}
\`\`\`

Return format:
[
  {
    "type": "import",
    "severity": "error",
    "line": 5,
    "column": 1,
    "message": "Cannot find module './nonexistent'",
    "code": "import { x } from './nonexistent';"
  }
]

If no errors, return empty array [].`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || '[]';
    const importErrors = JSON.parse(result);
    
    return importErrors.map((error: any) => ({
      ...error,
      file,
      type: 'import' as const
    }));
    
  } catch (error: any) {
    return [{
      type: 'import',
      severity: 'error',
      file,
      message: `Failed to validate imports: ${error.message}`
    }];
  }
}

async function validateInfrastructure(file: string, infrastructureContext: InfrastructureContext, jobId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  try {
    const content = await fs.readFile(file, 'utf-8');
    
    // Infrastructure validation using AI
    const prompt = `Check for infrastructure-related issues in this code and return only JSON array of errors:

Code:
\`\`\`typescript
${content}
\`\`\`

Infrastructure Context:
${JSON.stringify(infrastructureContext, null, 2)}

Return format:
[
  {
    "type": "infrastructure",
    "severity": "error",
    "line": 20,
    "column": 15,
    "message": "Missing environment variable for database connection",
    "code": "const db = new Database();"
  }
]

If no errors, return empty array [].`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || '[]';
    const infraErrors = JSON.parse(result);
    
    return infraErrors.map((error: any) => ({
      ...error,
      file,
      type: 'infrastructure' as const
    }));
    
  } catch (error: any) {
    return [{
      type: 'infrastructure',
      severity: 'error',
      file,
      message: `Failed to validate infrastructure: ${error.message}`
    }];
  }
}

async function validateSecurity(file: string, jobId: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];
  
  try {
    const content = await fs.readFile(file, 'utf-8');
    
    // Security validation using AI
    const prompt = `Check for security issues in this code and return only JSON array of warnings:

\`\`\`typescript
${content}
\`\`\`

Return format:
[
  {
    "type": "security",
    "line": 25,
    "message": "SQL injection vulnerability detected",
    "suggestion": "Use parameterized queries"
  }
]

If no warnings, return empty array [].`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || '[]';
    const securityWarnings = JSON.parse(result);
    
    return securityWarnings.map((warning: any) => ({
      ...warning,
      file,
      type: 'security' as const
    }));
    
  } catch (error: any) {
    return [{
      type: 'security',
      file,
      message: `Failed to validate security: ${error.message}`
    }];
  }
}

async function validatePerformance(file: string, jobId: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];
  
  try {
    const content = await fs.readFile(file, 'utf-8');
    
    // Performance validation using AI
    const prompt = `Check for performance issues in this code and return only JSON array of warnings:

\`\`\`typescript
${content}
\`\`\`

Return format:
[
  {
    "type": "performance",
    "line": 30,
    "message": "N+1 query problem detected",
    "suggestion": "Use eager loading or batch queries"
  }
]

If no warnings, return empty array [].`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || '[]';
    const performanceWarnings = JSON.parse(result);
    
    return performanceWarnings.map((warning: any) => ({
      ...warning,
      file,
      type: 'performance' as const
    }));
    
  } catch (error: any) {
    return [{
      type: 'performance',
      file,
      message: `Failed to validate performance: ${error.message}`
    }];
  }
}

async function validateDependencies(projectPath: string, jobId: string): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check for missing dependencies
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    // Basic dependency validation
    if (!dependencies.express && !devDependencies.express) {
      errors.push({
        type: 'dependency',
        severity: 'warning',
        file: 'package.json',
        message: 'Express.js dependency not found',
        suggestion: 'Add express to dependencies if building a web server'
      });
    }
    
    return errors;
    
  } catch (error: any) {
    return [{
      type: 'dependency',
      severity: 'error',
      file: 'package.json',
      message: `Failed to validate dependencies: ${error.message}`
    }];
  }
}

async function validateProjectStructure(projectPath: string, jobId: string): Promise<ValidationWarning[]> {
  const warnings: ValidationWarning[] = [];
  
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    
    // Check for essential files
    const hasPackageJson = entries.some(e => e.name === 'package.json');
    const hasTsConfig = entries.some(e => e.name === 'tsconfig.json');
    const hasSrc = entries.some(e => e.isDirectory() && e.name === 'src');
    
    if (!hasPackageJson) {
      warnings.push({
        type: 'best_practice',
        file: 'project',
        message: 'No package.json found',
        suggestion: 'Create package.json for Node.js project'
      });
    }
    
    if (!hasTsConfig) {
      warnings.push({
        type: 'best_practice',
        file: 'project',
        message: 'No tsconfig.json found',
        suggestion: 'Create tsconfig.json for TypeScript configuration'
      });
    }
    
    if (!hasSrc) {
      warnings.push({
        type: 'best_practice',
        file: 'project',
        message: 'No src directory found',
        suggestion: 'Create src directory for source code organization'
      });
    }
    
    return warnings;
    
  } catch (error: any) {
    return [{
      type: 'best_practice',
      file: 'project',
      message: `Failed to validate project structure: ${error.message}`
    }];
  }
}

async function generateAutoFix(error: ValidationError, projectPath: string, jobId: string): Promise<ValidationFix | null> {
  try {
    const content = await fs.readFile(error.file, 'utf-8');
    
    const prompt = `Generate an auto-fix for this validation error:

Error: ${error.message}
File: ${error.file}
Line: ${error.line}
Column: ${error.column}
Code: ${error.code}

Current file content:
\`\`\`typescript
${content}
\`\`\`

Return only JSON with this format:
{
  "type": "auto",
  "file": "${error.file}",
  "description": "Fix description",
  "originalCode": "original code snippet",
  "fixedCode": "fixed code snippet"
}

If no auto-fix is possible, return null.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content || 'null';
    const fix = JSON.parse(result);
    
    return fix;
    
  } catch (error: any) {
    console.warn(`[ValidationAndFinalization] Failed to generate auto-fix: ${error.message}`);
    return null;
  }
}

async function applyFix(fix: ValidationFix, projectPath: string, jobId: string): Promise<boolean> {
  try {
    if (!fix.originalCode || !fix.fixedCode) {
      return false;
    }
    
    const content = await fs.readFile(fix.file, 'utf-8');
    const updatedContent = content.replace(fix.originalCode, fix.fixedCode);
    await fs.writeFile(fix.file, updatedContent, 'utf-8');
    
    return true;
    
  } catch (error: any) {
    console.error(`[ValidationAndFinalization] Failed to apply fix: ${error.message}`);
    return false;
  }
}

async function validateFinalProjectStructure(projectPath: string, jobId: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(projectPath, { withFileTypes: true });
    
    // Check for essential files
    const hasPackageJson = entries.some(e => e.name === 'package.json');
    const hasSrc = entries.some(e => e.isDirectory() && e.name === 'src');
    
    return hasPackageJson && hasSrc;
    
  } catch (error: any) {
    console.error(`[ValidationAndFinalization] Failed to validate final project structure: ${error.message}`);
    return false;
  }
} 