import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';

const execAsync = promisify(exec);

export interface BuildError {
  type: 'typescript' | 'eslint' | 'build' | 'test' | 'runtime';
  file?: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
  stack?: string;
}

export interface BuildResult {
  success: boolean;
  errors: BuildError[];
  warnings: BuildError[];
  logs: string[];
  fixedFiles: string[];
  retryCount: number;
}

export interface FixRequest {
  error: BuildError;
  projectPath: string;
  allCode: string;
  context: string;
}

export class BuildFixService {
  private maxRetries = 5;

  /**
   * Main pipeline: Install → Build → Collect Errors → AI Fix Recursively
   */
  async runBuildAndFixPipeline(projectPath: string, jobId: string): Promise<BuildResult> {
    console.log(`[BuildFix] Starting build and fix pipeline for ${projectPath}`);
    
    let retryCount = 0;
    let totalFixedFiles: string[] = [];
    let allLogs: string[] = [];

    while (retryCount < this.maxRetries) {
      console.log(`[BuildFix] Attempt ${retryCount + 1}/${this.maxRetries}`);
      
      // Step 1: Install dependencies
      const installResult = await this.installDependencies(projectPath);
      allLogs.push(...installResult.logs);
      
      if (!installResult.success) {
        console.log(`[BuildFix] Dependency installation failed`);
        return {
          success: false,
          errors: installResult.errors,
          warnings: installResult.warnings,
          logs: allLogs,
          fixedFiles: totalFixedFiles,
          retryCount
        };
      }

      // Step 2: Build and collect all errors
      const buildResult = await this.buildAndCollectErrors(projectPath, jobId);
      allLogs.push(...buildResult.logs);

      if (buildResult.success) {
        console.log(`[BuildFix] All validations passed on attempt ${retryCount + 1}`);
        return {
          success: true,
          errors: [],
          warnings: buildResult.warnings,
          logs: allLogs,
          fixedFiles: totalFixedFiles,
          retryCount
        };
      }

      // Step 3: Parse errors to get file names and error details
      const errors = this.parseErrorsFromLogs(buildResult.logs);
      console.log(`[BuildFix] Found ${errors.length} errors to fix`);

      if (errors.length === 0) {
        console.log(`[BuildFix] No parseable errors found, but build failed`);
        return {
          success: false,
          errors: [],
          warnings: buildResult.warnings,
          logs: allLogs,
          fixedFiles: totalFixedFiles,
          retryCount
        };
      }

      // Step 4: Send each error to AI and fix recursively
      let fixedAny = false;
      for (const error of errors) {
        const fixResult = await this.fixErrorWithAI(error, projectPath, jobId);
        if (fixResult.success) {
          fixedAny = true;
          totalFixedFiles.push(...fixResult.fixedFiles);
          allLogs.push(...fixResult.logs);
        }
      }

      if (!fixedAny) {
        console.log(`[BuildFix] No errors could be fixed on attempt ${retryCount + 1}`);
        return {
          success: false,
          errors,
          warnings: buildResult.warnings,
          logs: allLogs,
          fixedFiles: totalFixedFiles,
          retryCount
        };
      }

      retryCount++;
    }

    console.log(`[BuildFix] Max retries reached, returning final result`);
    return {
      success: false,
      errors: [],
      warnings: [],
      logs: allLogs,
      fixedFiles: totalFixedFiles,
      retryCount
    };
  }

  /**
   * Step 1: Install dependencies for all directories
   */
  private async installDependencies(projectPath: string): Promise<BuildResult> {
    const logs: string[] = [];
    const warnings: BuildError[] = [];
    const errors: BuildError[] = [];

    try {
      // Check for backend and frontend directories
      const backendPath = path.join(projectPath, 'backend');
      const frontendPath = path.join(projectPath, 'frontend');
      
      const hasBackend = await fs.access(backendPath).then(() => true).catch(() => false);
      const hasFrontend = await fs.access(frontendPath).then(() => true).catch(() => false);
      
      // Check if there's a package.json in the root (monorepo style)
      const rootPackageJsonPath = path.join(projectPath, 'package.json');
      const hasRootPackageJson = await fs.access(rootPackageJsonPath).then(() => true).catch(() => false);

      if (!hasBackend && !hasFrontend && !hasRootPackageJson) {
        logs.push('No package.json found in root, backend, or frontend directories');
        return { success: true, errors: [], warnings: [], logs, fixedFiles: [], retryCount: 0 };
      }

      // Install dependencies for backend
      if (hasBackend) {
        logs.push('Installing backend dependencies...');
        try {
          const { stdout, stderr } = await execAsync('npm install', { cwd: backendPath, timeout: 120000 });
          logs.push(`Backend dependencies installed successfully:\n${stdout}`);
          if (stderr) {
            logs.push(`Backend npm install warnings:\n${stderr}`);
          }
        } catch (error: any) {
          logs.push(`Backend dependency installation failed: ${error.stderr || error.message}`);
          errors.push({
            type: 'runtime',
            message: `Backend dependency installation failed: ${error.stderr || error.message}`,
            code: 'DEPENDENCY_INSTALL_FAILED'
          });
        }
      }

      // Install dependencies for frontend
      if (hasFrontend) {
        logs.push('Installing frontend dependencies...');
        try {
          const { stdout, stderr } = await execAsync('npm install', { cwd: frontendPath, timeout: 120000 });
          logs.push(`Frontend dependencies installed successfully:\n${stdout}`);
          if (stderr) {
            logs.push(`Frontend npm install warnings:\n${stderr}`);
          }
        } catch (error: any) {
          logs.push(`Frontend dependency installation failed: ${error.stderr || error.message}`);
          errors.push({
            type: 'runtime',
            message: `Frontend dependency installation failed: ${error.stderr || error.message}`,
            code: 'DEPENDENCY_INSTALL_FAILED'
          });
        }
      }

      // Install dependencies for root (if it has package.json)
      if (hasRootPackageJson) {
        logs.push('Installing root dependencies...');
        try {
          const { stdout, stderr } = await execAsync('npm install', { cwd: projectPath, timeout: 120000 });
          logs.push(`Root dependencies installed successfully:\n${stdout}`);
          if (stderr) {
            logs.push(`Root npm install warnings:\n${stderr}`);
          }
        } catch (error: any) {
          logs.push(`Root dependency installation failed: ${error.stderr || error.message}`);
          errors.push({
            type: 'runtime',
            message: `Root dependency installation failed: ${error.stderr || error.message}`,
            code: 'DEPENDENCY_INSTALL_FAILED'
          });
        }
      }

    } catch (error: any) {
      logs.push(`Error during dependency installation: ${error.message}`);
      errors.push({
        type: 'runtime',
        message: error.message,
        code: error.code
      });
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      logs,
      fixedFiles: [],
      retryCount: 0
    };
  }

  /**
   * Step 2: Build and collect all errors
   */
  private async buildAndCollectErrors(projectPath: string, jobId: string): Promise<BuildResult> {
    const logs: string[] = [];
    const warnings: BuildError[] = [];
    const errors: BuildError[] = [];

    try {
      // Check for backend and frontend directories
      const backendPath = path.join(projectPath, 'backend');
      const frontendPath = path.join(projectPath, 'frontend');
      
      const hasBackend = await fs.access(backendPath).then(() => true).catch(() => false);
      const hasFrontend = await fs.access(frontendPath).then(() => true).catch(() => false);
      
      // Check if there's a package.json in the root (monorepo style)
      const rootPackageJsonPath = path.join(projectPath, 'package.json');
      const hasRootPackageJson = await fs.access(rootPackageJsonPath).then(() => true).catch(() => false);

      // Run validations for backend
      if (hasBackend) {
        logs.push('Running backend validations...');
        const backendResult = await this.runValidationForDirectory(backendPath, 'backend', jobId);
        logs.push(...backendResult.logs);
        errors.push(...backendResult.errors);
        warnings.push(...backendResult.warnings);
      }

      // Run validations for frontend
      if (hasFrontend) {
        logs.push('Running frontend validations...');
        const frontendResult = await this.runValidationForDirectory(frontendPath, 'frontend', jobId);
        logs.push(...frontendResult.logs);
        errors.push(...frontendResult.errors);
        warnings.push(...frontendResult.warnings);
      }

      // Run validations for root (if it has package.json)
      if (hasRootPackageJson) {
        logs.push('Running root validations...');
        const rootResult = await this.runValidationForDirectory(projectPath, 'root', jobId);
        logs.push(...rootResult.logs);
        errors.push(...rootResult.errors);
        warnings.push(...rootResult.warnings);
      }

    } catch (error: any) {
      logs.push(`Error during validation: ${error.message}`);
      errors.push({
        type: 'runtime',
        message: error.message,
        code: error.code
      });
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      logs,
      fixedFiles: [],
      retryCount: 0
    };
  }

  /**
   * Run validation steps for a specific directory
   */
  private async runValidationForDirectory(dirPath: string, dirName: string, jobId: string): Promise<BuildResult> {
    const logs: string[] = [];
    const warnings: BuildError[] = [];
    const errors: BuildError[] = [];

    try {
      // Check if package.json exists in this directory
      const packageJsonPath = path.join(dirPath, 'package.json');
      const hasPackageJson = await fs.access(packageJsonPath).then(() => true).catch(() => false);

      if (!hasPackageJson) {
        logs.push(`No package.json found in ${dirName}, skipping validations`);
        return { success: true, errors: [], warnings: [], logs, fixedFiles: [], retryCount: 0 };
      }

      logs.push(`Found package.json in ${dirName}, running validations...`);

      // Step 1: TypeScript compilation check
      logs.push(`Running TypeScript compilation check for ${dirName}...`);
      try {
        const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: dirPath });
        // TypeScript errors can be in either stdout or stderr
        const output = stdout || stderr;
        if (output && output.trim()) {
          logs.push(`${dirName} TypeScript errors:\n${output}`);
          // Parse TypeScript errors and add them to the errors array
          const tsErrors = this.parseTypeScriptErrors(output);
          tsErrors.forEach(error => {
            if (error.file) {
              error.file = `${dirName}/${error.file}`;
            }
          });
          errors.push(...tsErrors);
        } else {
          logs.push(`${dirName} TypeScript compilation passed`);
        }
      } catch (error: any) {
        // TypeScript command failed, errors are in stdout or stderr
        const output = error.stdout || error.stderr || '';
        logs.push(`${dirName} TypeScript compilation failed: ${output}`);
        // Parse TypeScript errors and add them to the errors array
        const tsErrors = this.parseTypeScriptErrors(output);
        tsErrors.forEach(error => {
          if (error.file) {
            error.file = `${dirName}/${error.file}`;
          }
        });
        errors.push(...tsErrors);
      }

      // Step 2: ESLint check
      logs.push(`Running ESLint check for ${dirName}...`);
      try {
        const { stdout, stderr } = await execAsync('npx eslint . --ext .ts,.tsx,.js,.jsx', { cwd: dirPath });
        if (stderr) {
          logs.push(`${dirName} ESLint errors:\n${stderr}`);
          const eslintErrors = this.parseESLintErrors(stderr);
          eslintErrors.forEach(error => {
            if (error.file) {
              error.file = `${dirName}/${error.file}`;
            }
          });
          errors.push(...eslintErrors);
        } else {
          logs.push(`${dirName} ESLint passed`);
        }
      } catch (error: any) {
        logs.push(`${dirName} ESLint failed: ${error.stderr || error.message}`);
        const eslintErrors = this.parseESLintErrors(error.stderr || '');
        eslintErrors.forEach(error => {
          if (error.file) {
            error.file = `${dirName}/${error.file}`;
          }
        });
        errors.push(...eslintErrors);
      }

      // Step 3: NPM build
      logs.push(`Running npm build for ${dirName}...`);
      try {
        const { stdout, stderr } = await execAsync('npm run build', { cwd: dirPath });
        logs.push(`${dirName} build output:\n${stdout}`);
        if (stderr) {
          logs.push(`${dirName} build warnings:\n${stderr}`);
          const buildWarnings = this.parseBuildWarnings(stderr);
          buildWarnings.forEach(warning => {
            if (warning.file) {
              warning.file = `${dirName}/${warning.file}`;
            }
          });
          warnings.push(...buildWarnings);
        }
      } catch (error: any) {
        logs.push(`${dirName} build failed: ${error.stderr || error.message}`);
        const buildErrors = this.parseNpmBuildErrors(error.stderr || '');
        buildErrors.forEach(error => {
          if (error.file) {
            error.file = `${dirName}/${error.file}`;
          }
        });
        errors.push(...buildErrors);
      }

      // Step 4: Jest tests (if available)
      logs.push(`Running Jest tests for ${dirName}...`);
      try {
        const { stdout, stderr } = await execAsync('npm test', { cwd: dirPath });
        logs.push(`${dirName} test output:\n${stdout}`);
        if (stderr) {
          logs.push(`${dirName} test warnings:\n${stderr}`);
          const testWarnings = this.parseTestWarnings(stderr);
          testWarnings.forEach(warning => {
            if (warning.file) {
              warning.file = `${dirName}/${warning.file}`;
            }
          });
          warnings.push(...testWarnings);
        }
      } catch (error: any) {
        logs.push(`${dirName} tests failed: ${error.stderr || error.message}`);
        const testErrors = this.parseTestErrors(error.stderr || '');
        testErrors.forEach(error => {
          if (error.file) {
            error.file = `${dirName}/${error.file}`;
          }
        });
        errors.push(...testErrors);
      }

    } catch (error: any) {
      logs.push(`Error during ${dirName} validation: ${error.message}`);
      errors.push({
        type: 'runtime',
        message: `${dirName}: ${error.message}`,
        code: error.code
      });
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      logs,
      fixedFiles: [],
      retryCount: 0
    };
  }

  /**
   * Step 3: Parse errors from logs to get file names and error details
   */
  private parseErrorsFromLogs(logs: string[]): BuildError[] {
    const errors: BuildError[] = [];
    const logText = logs.join('\n');

    // Simple error parsing - just capture all error-like lines and let AI handle the details
    const errorLines = logText.split('\n').filter(line => 
      line.includes('error') || 
      line.includes('Error') || 
      line.includes('ERROR') ||
      line.includes('TS') ||
      line.includes('Cannot find') ||
      line.includes('has no exported member') ||
      line.includes('Could not find')
    );

    // Create a single comprehensive error for AI to fix
    if (errorLines.length > 0) {
      errors.push({
        type: 'typescript',
        message: `Build errors detected:\n${errorLines.join('\n')}`,
        code: 'BUILD_ERRORS'
      });
    }

    return errors;
  }

  // Simple parsing functions for different error types
  private parseTypeScriptErrors(logText: string): BuildError[] {
    return [{
      type: 'typescript',
      message: `TypeScript compilation errors:\n${logText}`,
      code: 'TS_ERRORS'
    }];
  }

  private parseESLintErrors(logText: string): BuildError[] {
    return [{
      type: 'eslint',
      message: `ESLint errors:\n${logText}`,
      code: 'ESLINT_ERRORS'
    }];
  }

  private parseNpmBuildErrors(logText: string): BuildError[] {
    return [{
      type: 'build',
      message: `Build errors:\n${logText}`,
      code: 'BUILD_ERRORS'
    }];
  }

  private parseTestErrors(logText: string): BuildError[] {
    return [{
      type: 'test',
      message: `Test errors:\n${logText}`,
      code: 'TEST_ERRORS'
    }];
  }

  private parseBuildWarnings(logText: string): BuildError[] {
    return [{
      type: 'build',
      message: `Build warnings:\n${logText}`,
      code: 'BUILD_WARNINGS'
    }];
  }

  private parseTestWarnings(logText: string): BuildError[] {
    return [{
      type: 'test',
      message: `Test warnings:\n${logText}`,
      code: 'TEST_WARNINGS'
    }];
  }

  /**
   * Step 4: Send each error to AI and fix recursively
   */
  private async fixErrorWithAI(error: BuildError, projectPath: string, jobId: string): Promise<{ success: boolean; fixedFiles: string[]; logs: string[] }> {
    console.log(`[BuildFix] Attempting to fix error: ${error.message}`);
    
    const logs: string[] = [];
    const fixedFiles: string[] = [];

    try {
      // Get relevant project code for context (optimized to prevent token limit exceeded)
      const relevantCode = await this.getRelevantProjectCode(projectPath, error);
      console.log(`[BuildFix] Collected relevant project code, total length: ${relevantCode.length}`);

      // Determine the target directory for fixing files
      let targetDirectory = projectPath;
      if (error.file) {
        // If error.file contains a directory prefix (e.g., "backend/src/..."), use that directory
        const filePathParts = error.file.split('/');
        if (filePathParts.length > 1) {
          const firstDir = filePathParts[0];
          const potentialTargetDir = path.join(projectPath, firstDir);
          try {
            const stats = await fs.stat(potentialTargetDir);
            if (stats.isDirectory()) {
              targetDirectory = potentialTargetDir;
              console.log(`[BuildFix] Using target directory: ${targetDirectory} (based on error file: ${error.file})`);
            }
          } catch (error) {
            // Directory doesn't exist, use project root
            console.log(`[BuildFix] Target directory ${potentialTargetDir} doesn't exist, using project root`);
          }
        }
      }

      // Create fix request
      const fixRequest: FixRequest = {
        error,
        projectPath,
        allCode: relevantCode, // Use optimized code collection
        context: `Error in project: ${error.message}`
      };

      // Log what we're sending to AI
      console.log(`\n[BuildFix] ===== SENDING TO AI =====`);
      console.log(`[BuildFix] Error: ${error.message}`);
      console.log(`[BuildFix] Context: ${fixRequest.context}`);
      console.log(`[BuildFix] Project code length: ${relevantCode.length}`);
      console.log(`[BuildFix] Target directory for fixes: ${targetDirectory}`);
      console.log(`[BuildFix] ===== END SENDING =====\n`);

      // Check if context is still too large and use minimal context if needed
      const estimateTokens = (text: string) => Math.ceil(text.length / 4);
      const totalTokens = estimateTokens(relevantCode);
      
      if (totalTokens > 120000) { // Conservative limit
        console.log(`[BuildFix] Context too large (${totalTokens} tokens), using minimal context...`);
        
        // Use minimal context with just the error file and essential config files
        const minimalContext = await this.getMinimalContext(projectPath, error);
        fixRequest.allCode = minimalContext;
        console.log(`[BuildFix] Using minimal context: ${minimalContext.length} characters`);
      }

      // Attempt AI fix
      console.log(`[BuildFix] Calling AI to fix error...`);
      const fixResult = await this.generateAIFix(fixRequest, jobId);
      
      // Log what AI returned
      console.log(`\n[BuildFix] ===== AI RESPONSE =====`);
      console.log(`[BuildFix] Success: ${fixResult.success}`);
      console.log(`[BuildFix] Has fixed content: ${!!fixResult.fixedContent}`);
      console.log(`[BuildFix] Has new files: ${!!fixResult.newFiles}`);
      console.log(`[BuildFix] Error: ${fixResult.error ?? 'none'}`);
      
      if (fixResult.fixedContent) {
        if (typeof fixResult.fixedContent === 'string') {
          console.log(`[BuildFix] Fixed content length: ${fixResult.fixedContent.length} characters`);
          console.log(`[BuildFix] Fixed content preview: ${fixResult.fixedContent.substring(0, 200)}...`);
        } else {
          console.log(`[BuildFix] Fixed content files: ${Object.keys(fixResult.fixedContent).join(', ')}`);
          for (const [filePath, content] of Object.entries(fixResult.fixedContent)) {
            console.log(`[BuildFix] Fixed file ${filePath} length: ${content.length} characters`);
            console.log(`[BuildFix] Fixed file ${filePath} preview: ${content.substring(0, 200)}...`);
          }
        }
      }
      
      if (fixResult.newFiles) {
        console.log(`[BuildFix] New files to create: ${Object.keys(fixResult.newFiles).join(', ')}`);
        for (const [newFilePath, content] of Object.entries(fixResult.newFiles)) {
          console.log(`[BuildFix] New file ${newFilePath} length: ${content.length} characters`);
          console.log(`[BuildFix] New file ${newFilePath} preview: ${content.substring(0, 200)}...`);
        }
      }
      console.log(`[BuildFix] ===== END AI RESPONSE =====\n`);
      
      if (fixResult.success && (fixResult.fixedContent || fixResult.newFiles)) {
        // Apply the fixes for existing files
        if (fixResult.fixedContent) {
          if (typeof fixResult.fixedContent === 'string') {
            // Single file fix
            if (error.file) {
              const filePath = path.resolve(targetDirectory, error.file);
              console.log(`[BuildFix] Writing fixed content to: ${filePath}`);
              await fs.writeFile(filePath, fixResult.fixedContent, 'utf-8');
              fixedFiles.push(error.file);
              logs.push(`Fixed ${error.file} with AI-generated solution`);
              console.log(`[BuildFix] Successfully wrote fixed content to ${error.file}`);
            }
          } else {
            // Multiple files fix
            for (const [filePath, content] of Object.entries(fixResult.fixedContent)) {
              const fullPath = path.join(targetDirectory, filePath);
              console.log(`[BuildFix] Writing fixed content to: ${fullPath}`);
              await fs.mkdir(path.dirname(fullPath), { recursive: true });
              await fs.writeFile(fullPath, content, 'utf-8');
              fixedFiles.push(filePath);
              logs.push(`Fixed ${filePath} with AI-generated solution`);
              console.log(`[BuildFix] Successfully wrote fixed content to ${filePath}`);
            }
          }
        }

        // If new files were created, write them
        if (fixResult.newFiles) {
          for (const [newFilePath, content] of Object.entries(fixResult.newFiles)) {
            const fullPath = path.join(targetDirectory, newFilePath);
            console.log(`[BuildFix] Creating new file: ${fullPath}`);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, 'utf-8');
            fixedFiles.push(newFilePath);
            logs.push(`Created new file ${newFilePath}`);
            console.log(`[BuildFix] Created new file ${newFilePath}`);
          }
        }

        return { success: true, fixedFiles, logs };
      } else {
        logs.push(`AI fix failed: ${fixResult.error ?? 'Unknown error'}`);
        console.log(`[BuildFix] AI fix failed: ${fixResult.error ?? 'Unknown error'}`);
        return { success: false, fixedFiles: [], logs };
      }

    } catch (error: any) {
      logs.push(`Error during fix attempt: ${error.message}`);
      console.log(`[BuildFix] Error during fix attempt: ${error.message}`);
      return { success: false, fixedFiles: [], logs };
    }
  }

  /**
   * Get all project code for context
   */
  private async getAllProjectCode(projectPath: string): Promise<string> {
    const codeFiles: string[] = [];
    
    async function scanDirectory(dir: string, relativePath: string = '') {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip node_modules, .git, dist, build, etc.
            if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
              await scanDirectory(fullPath, relativeFilePath);
            }
          } else if (entry.isFile()) {
            // Include TypeScript, JavaScript, JSON, and other code files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt'].includes(ext)) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                codeFiles.push(`// File: ${relativeFilePath}\n${content}\n\n`);
              } catch (readError) {
                // Skip files that can't be read
              }
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
      }
    }

    await scanDirectory(projectPath);
    return codeFiles.join('\n');
  }

  /**
   * Get relevant project code for context (optimized to prevent token limit exceeded)
   */
  private async getRelevantProjectCode(projectPath: string, error: BuildError): Promise<string> {
    const codeFiles: string[] = [];
    const maxTokens = 100000; // Conservative limit to stay well under 128k
    let currentTokens = 0;
    const estimateTokens = (text: string) => Math.ceil(text.length / 4); // Rough estimate: 1 token ≈ 4 characters
    
    // Priority files to include first
    const priorityFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/index.tsx',
      'src/App.tsx',
      'src/App.ts',
      'src/main.ts',
      'src/main.tsx'
    ];
    
    // If error has a specific file, prioritize it and its dependencies
    const errorFile = error.file;
    const errorFilePriority = errorFile ? [errorFile] : [];
    
    async function scanDirectory(dir: string, relativePath: string = '', isPriority: boolean = false) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        // Sort entries: priority files first, then others
        entries.sort((a, b) => {
          const aPriority = priorityFiles.includes(a.name) || errorFilePriority.includes(path.join(relativePath, a.name));
          const bPriority = priorityFiles.includes(b.name) || errorFilePriority.includes(path.join(relativePath, b.name));
          if (aPriority && !bPriority) return -1;
          if (!aPriority && bPriority) return 1;
          return 0;
        });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip node_modules, .git, dist, build, etc.
            if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.vscode', '.idea'].includes(entry.name)) {
              await scanDirectory(fullPath, relativeFilePath, isPriority);
            }
          } else if (entry.isFile()) {
            // Include TypeScript, JavaScript, JSON, and other code files
            const ext = path.extname(entry.name).toLowerCase();
            if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                const fileTokens = estimateTokens(content);
                
                // Check if adding this file would exceed token limit
                if (currentTokens + fileTokens > maxTokens) {
                  console.log(`[BuildFix] Skipping ${relativeFilePath} - would exceed token limit (${currentTokens + fileTokens} > ${maxTokens})`);
                  continue;
                }
                
                // Truncate very large files (keep first 2000 lines)
                let truncatedContent = content;
                if (content.split('\n').length > 2000) {
                  const lines = content.split('\n');
                  truncatedContent = lines.slice(0, 2000).join('\n') + '\n// ... (truncated - file too large)';
                  console.log(`[BuildFix] Truncated ${relativeFilePath} from ${lines.length} to 2000 lines`);
                }
                
                const fileEntry = `// File: ${relativeFilePath}\n${truncatedContent}\n\n`;
                codeFiles.push(fileEntry);
                currentTokens += estimateTokens(fileEntry);
                
                console.log(`[BuildFix] Added ${relativeFilePath} (${fileTokens} tokens, total: ${currentTokens})`);
              } catch (readError) {
                // Skip files that can't be read
                console.log(`[BuildFix] Could not read ${relativeFilePath}: ${readError}`);
              }
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
        console.log(`[BuildFix] Could not access directory ${dir}: ${error}`);
      }
    }

    await scanDirectory(projectPath);
    
    console.log(`[BuildFix] Collected ${codeFiles.length} files with estimated ${currentTokens} tokens`);
    return codeFiles.join('\n');
  }

  /**
   * Get minimal context for very large projects (fallback when token limit is exceeded)
   */
  private async getMinimalContext(projectPath: string, error: BuildError): Promise<string> {
    const codeFiles: string[] = [];
    
    // Only include essential files
    const essentialFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/index.tsx',
      'src/App.tsx',
      'src/App.ts'
    ];
    
    // If error has a specific file, include it
    if (error.file) {
      essentialFiles.push(error.file);
    }
    
    for (const filePath of essentialFiles) {
      try {
        const fullPath = path.join(projectPath, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        // Truncate large files
        let truncatedContent = content;
        if (content.split('\n').length > 500) {
          const lines = content.split('\n');
          truncatedContent = lines.slice(0, 500).join('\n') + '\n// ... (truncated)';
        }
        
        codeFiles.push(`// File: ${filePath}\n${truncatedContent}\n\n`);
      } catch (readError) {
        // Skip files that don't exist
        console.log(`[BuildFix] Could not read ${filePath}: ${readError}`);
      }
    }
    
    console.log(`[BuildFix] Minimal context: ${codeFiles.length} essential files`);
    return codeFiles.join('\n');
  }

  /**
   * Generate AI fix for an error
   */
  private async generateAIFix(fixRequest: FixRequest, jobId: string): Promise<{ success: boolean; fixedContent?: string | Record<string, string>; newFiles?: Record<string, string>; error?: string }> {
    const { error, allCode, context } = fixRequest;

    const prompt = `You are an expert software developer fixing build errors in a TypeScript/Node.js project.

**ERROR:** ${error.message}
**TYPE:** ${error.type}
**CODE:** ${error.code || 'unknown'}

**PROJECT CODE:**
${allCode}

**TASK:** Fix the build error comprehensively.

**REQUIREMENTS:**
1. Fix ALL errors mentioned in the error message
2. Provide COMPLETE corrected file content (not partial fixes)
3. If creating new files, provide COMPLETE file content with proper imports
4. If updating package.json, add missing dependencies to correct section
5. For @types packages, add to devDependencies
6. Ensure all TypeScript types are properly defined
7. Follow TypeScript/Node.js best practices

**DIRECTORY RULES:**
- If error from "backend/src/...", ALL paths relative to backend directory
- If error from "frontend/src/...", ALL paths relative to frontend directory  
- If error from "src/...", ALL paths relative to root directory
- NEVER create files at project root unless specifically needed

**FIXING GUIDELINES:**
- Type errors: Use interfaces or 'typeof' appropriately
- Import/export mismatches: Check default vs named exports
- Missing @types: Add to devDependencies in package.json
- Missing files: Create complete files with proper imports/exports

**RESPONSE FORMAT:**
Return ONLY valid JSON:
{
  "success": true/false,
  "fixedContent": {
    "path/to/file.ts": "COMPLETE corrected content"
  },
  "newFiles": {
    "path/to/new.ts": "COMPLETE new file content"
  },
  "explanation": "brief explanation"
}

Return only the JSON response, no explanations outside JSON.`;

    try {
      // Try OpenAI first, then Anthropic as fallback
      let response;
      let aiResponse = '';
      
      try {
        console.log(`[BuildFix] Attempting OpenAI fix for error: ${error.message}`);
        response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.3,
        });
        
        const content = response.choices[0]?.message?.content;
        if (content) {
          aiResponse = content;
          console.log(`[BuildFix] OpenAI response received, length: ${content.length}`);
          console.log(`[BuildFix] OpenAI response preview: ${content.substring(0, 200)}...`);
          
          try {
            const result = JSON.parse(content);
            console.log(`[BuildFix] OpenAI JSON parsed successfully: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            return result;
          } catch (parseError) {
            console.log(`[BuildFix] OpenAI JSON parse failed: ${parseError}`);
            console.log(`[BuildFix] Full OpenAI response: ${content}`);
            
            // Try to extract JSON from markdown code fences
            try {
              const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch) {
                const jsonContent = jsonMatch[1].trim();
                const result = JSON.parse(jsonContent);
                console.log(`[BuildFix] OpenAI JSON extracted from markdown successfully: ${result.success ? 'SUCCESS' : 'FAILED'}`);
                return result;
              }
            } catch (extractError) {
              console.log(`[BuildFix] Failed to extract JSON from markdown: ${extractError}`);
            }
          }
        }
      } catch (openaiError) {
        console.log(`[BuildFix] OpenAI failed, trying Anthropic: ${openaiError}`);
        
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.3,
        });
        
        const content = response.content[0];
        if (content.type === 'text') {
          aiResponse = content.text;
          console.log(`[BuildFix] Anthropic response received, length: ${content.text.length}`);
          console.log(`[BuildFix] Anthropic response preview: ${content.text.substring(0, 200)}...`);
          
          try {
            const result = JSON.parse(content.text);
            console.log(`[BuildFix] Anthropic JSON parsed successfully: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            return result;
          } catch (parseError) {
            console.log(`[BuildFix] Anthropic JSON parse failed: ${parseError}`);
            console.log(`[BuildFix] Full Anthropic response: ${content.text}`);
          }
        }
      }

      // If we get here, both AI providers failed to return valid JSON
      console.log(`[BuildFix] Both AI providers failed to return valid JSON`);
      console.log(`[BuildFix] Final AI response: ${aiResponse}`);
      
      return { success: false, error: 'Failed to get valid JSON response from AI' };
    } catch (error: any) {
      console.log(`[BuildFix] AI fix generation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export const buildFixService = new BuildFixService(); 