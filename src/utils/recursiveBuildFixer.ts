import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { openai, OPENAI_MODEL } from '../config/aiProvider';
import { GraphAwareFixer, GraphFixResult } from './graphAwareFixer';
import { ComponentMetadata, ComponentError } from './componentLevelFixer';

const execAsync = promisify(exec);

// Recursive Build-Fix Loop with Memory (Layer 3)
export class RecursiveBuildFixer {
  private graphFixer: GraphAwareFixer;
  private buildMemory: Map<string, BuildError[]> = new Map();
  private fixAttempts: Map<string, number> = new Map();
  private maxGlobalAttempts: number = 5;
  private maxComponentAttempts: number = 3;
  private errorPrioritization: Map<string, number> = new Map();
  private buildHistory: BuildHistory[] = [];

  constructor(
    private projectPath: string,
    private appType: string,
    private framework: string
  ) {
    this.graphFixer = new GraphAwareFixer(projectPath, appType, framework);
  }

  /**
   * Main entry point: Run recursive build-fix loop
   */
  async runRecursiveBuildFix(components: ComponentMetadata[]): Promise<RecursiveBuildFixResult> {
    console.log(`[RecursiveBuildFixer] Starting recursive build-fix loop for ${components.length} components`);
    
    // Initialize graph fixer
    this.graphFixer.buildDependencyGraph(components);
    
    let globalAttempt = 0;
    let totalFixed = 0;
    let totalErrors = 0;
    
    while (globalAttempt < this.maxGlobalAttempts) {
      globalAttempt++;
      console.log(`[RecursiveBuildFixer] Global attempt ${globalAttempt}/${this.maxGlobalAttempts}`);
      
      // Step 1: Run global build
      const buildResult = await this.runGlobalBuild();
      const buildTime = Date.now();
      
      if (buildResult.success) {
        console.log(`[RecursiveBuildFixer] ✅ Build successful on attempt ${globalAttempt}!`);
        return {
          success: true,
          globalAttempts: globalAttempt,
          totalFixed,
          totalErrors,
          buildHistory: this.buildHistory,
          finalBuildTime: buildResult.buildTime,
          componentsFixed: this.getFixedComponents()
        };
      }
      
      totalErrors = buildResult.errors.length;
      console.log(`[RecursiveBuildFixer] Build failed with ${totalErrors} errors`);
      
      // Step 2: Prioritize errors by component graph depth and error types
      const prioritizedErrors = this.prioritizeErrors(buildResult.errors);
      
      // Step 3: Fix errors using graph-aware approach
      const fixResult = await this.fixPrioritizedErrors(prioritizedErrors);
      
      if (fixResult.success) {
        totalFixed += fixResult.errorsFixed;
        console.log(`[RecursiveBuildFixer] Fixed ${fixResult.errorsFixed} errors in this attempt`);
      } else {
        console.warn(`[RecursiveBuildFixer] No progress made in this attempt`);
      }
      
      // Record build history
      this.buildHistory.push({
        attempt: globalAttempt,
        timestamp: new Date().toISOString(),
        buildTime: buildResult.buildTime,
        totalErrors,
        errorsFixed: fixResult.errorsFixed,
        prioritizedErrors: prioritizedErrors.map(e => ({
          component: e.component,
          error: e.error.error.code,
          priority: e.priority
        }))
      });
      
      // Check if we should continue
      if (fixResult.errorsFixed === 0 && globalAttempt > 1) {
        console.log(`[RecursiveBuildFixer] No progress made, stopping recursion`);
        break;
      }
    }
    
    // Final build attempt
    const finalBuild = await this.runGlobalBuild();
    
    return {
      success: finalBuild.success,
      globalAttempts: globalAttempt,
      totalFixed,
      totalErrors,
      buildHistory: this.buildHistory,
      finalBuildTime: finalBuild.buildTime,
      componentsFixed: this.getFixedComponents(),
      maxAttemptsReached: globalAttempt >= this.maxGlobalAttempts
    };
  }

  /**
   * Run global build (next build, vite build, etc.)
   */
  private async runGlobalBuild(): Promise<GlobalBuildResult> {
    const startTime = Date.now();
    
    try {
      let buildCommand: string;
      let errorParser: (output: string) => BuildError[];
      
      if (this.framework === 'nextjs') {
        buildCommand = `cd "${this.projectPath}/frontend" && npx next build 2>&1`;
        errorParser = this.parseNextBuildErrors.bind(this);
      } else if (this.framework === 'react') {
        buildCommand = `cd "${this.projectPath}/frontend" && npx vite build 2>&1`;
        errorParser = this.parseViteBuildErrors.bind(this);
      } else {
        // Fallback to TypeScript check
        buildCommand = `cd "${this.projectPath}/frontend" && npx tsc --noEmit 2>&1`;
        errorParser = this.parseTypeScriptErrors.bind(this);
      }
      
      const { stdout, stderr } = await execAsync(buildCommand, { timeout: 60000 });
      const output = stderr || stdout;
      const buildTime = Date.now() - startTime;
      
      // Check if build was successful
      const isSuccess = !output.includes('error') && 
                       !output.includes('Error') && 
                       !output.includes('failed') &&
                       (output.includes('✓') || output.includes('success') || output.includes('Built'));
      
      if (isSuccess) {
        return {
          success: true,
          buildTime,
          errors: [],
          output: output.substring(0, 1000) // First 1000 chars for logging
        };
      }
      
      // Parse errors
      const errors = errorParser(output);
      
      return {
        success: false,
        buildTime,
        errors,
        output: output.substring(0, 1000)
      };
      
    } catch (error: any) {
      const buildTime = Date.now() - startTime;
      const errorOutput = error.stderr || error.stdout || error.message;
      
      // Parse errors from failed command
      const errors = this.parseGenericBuildErrors(errorOutput);
      
      return {
        success: false,
        buildTime,
        errors,
        output: errorOutput.substring(0, 1000)
      };
    }
  }

  /**
   * Prioritize errors by component graph depth and error types
   */
  private prioritizeErrors(errors: BuildError[]): PrioritizedError[] {
    const prioritized: PrioritizedError[] = [];
    
    for (const error of errors) {
      let priority = 0;
      
      // Priority by component depth (leaves first)
      const componentDepth = this.graphFixer.getComponentDependencies(error.component).length;
      priority += componentDepth * 10; // Lower depth = higher priority
      
      // Priority by error type
      switch (error.error.code) {
        case 'TS2307': // Cannot find module
          priority += 100;
          break;
        case 'TS2339': // Property does not exist
          priority += 80;
          break;
        case 'TS2322': // Type assignment error
          priority += 60;
          break;
        case 'TS2304': // Cannot find name
          priority += 90;
          break;
        case 'TS1146': // Declaration expected
          priority += 70;
          break;
        default:
          priority += 50;
      }
      
      // Priority by error severity
      if (error.error.severity === 'error') {
        priority += 20;
      }
      
      // Priority by component category
      const metadata = this.graphFixer.getComponentFixer().getComponentMetadata(error.component);
      if (metadata?.category === 'utility') {
        priority += 30; // Fix utilities first
      } else if (metadata?.category === 'component') {
        priority += 20; // Then components
      } else if (metadata?.category === 'page') {
        priority += 10; // Then pages
      }
      
      prioritized.push({
        component: error.component,
        error,
        priority,
        depth: componentDepth
      });
    }
    
    // Sort by priority (highest first)
    prioritized.sort((a, b) => b.priority - a.priority);
    
    console.log(`[RecursiveBuildFixer] Prioritized ${prioritized.length} errors:`);
    prioritized.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.component} (priority: ${item.priority}, depth: ${item.depth}) - ${item.error.error.code}`);
    });
    
    return prioritized;
  }

  /**
   * Fix prioritized errors using graph-aware approach
   */
  private async fixPrioritizedErrors(prioritizedErrors: PrioritizedError[]): Promise<PrioritizedFixResult> {
    let totalFixed = 0;
    const fixedComponents = new Set<string>();
    
    // Group errors by component
    const errorsByComponent = new Map<string, ComponentError[]>();
    for (const item of prioritizedErrors) {
      if (!errorsByComponent.has(item.component)) {
        errorsByComponent.set(item.component, []);
      }
      errorsByComponent.get(item.component)!.push(item.error.error);
    }
    
    // Fix components in priority order
    for (const [componentName, errors] of errorsByComponent) {
      const attemptCount = this.fixAttempts.get(componentName) || 0;
      
      if (attemptCount >= this.maxComponentAttempts) {
        console.log(`[RecursiveBuildFixer] Max attempts reached for ${componentName}, skipping`);
        continue;
      }
      
      this.fixAttempts.set(componentName, attemptCount + 1);
      
      console.log(`[RecursiveBuildFixer] Fixing ${componentName} (attempt ${attemptCount + 1}, ${errors.length} errors)`);
      
      const fixResult = await this.graphFixer.getComponentFixer().fixComponentErrors(componentName, errors);
      
      if (fixResult.success && fixResult.errorsFixed > 0) {
        totalFixed += fixResult.errorsFixed;
        fixedComponents.add(componentName);
        console.log(`[RecursiveBuildFixer] ✅ Fixed ${fixResult.errorsFixed} errors in ${componentName}`);
      } else {
        console.log(`[RecursiveBuildFixer] ⚠️ No errors fixed in ${componentName}`);
      }
    }
    
    return {
      success: totalFixed > 0,
      errorsFixed: totalFixed,
      componentsFixed: Array.from(fixedComponents)
    };
  }

  /**
   * Parse Next.js build errors
   */
  private parseNextBuildErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Next.js error format: ./src/components/Component.tsx:15:8 - error TS2307: Cannot find module './Dependency'
      const match = line.match(/\.\/src\/(.+):(\d+):(\d+)\s*-\s*error\s+(.+):\s*(.+)/);
      if (match) {
        const [, filePath, lineNum, column, errorCode, message] = match;
        const componentName = path.basename(filePath, path.extname(filePath));
        
        errors.push({
          component: componentName,
          filePath: `src/${filePath}`,
          error: {
            type: 'TYPESCRIPT',
            code: errorCode,
            message: message.trim(),
            line: parseInt(lineNum),
            column: parseInt(column),
            severity: 'error'
          }
        });
      }
    }
    
    return errors;
  }

  /**
   * Parse Vite build errors
   */
  private parseViteBuildErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Vite error format: src/components/Component.tsx:15:8 - error TS2307: Cannot find module './Dependency'
      const match = line.match(/src\/(.+):(\d+):(\d+)\s*-\s*error\s+(.+):\s*(.+)/);
      if (match) {
        const [, filePath, lineNum, column, errorCode, message] = match;
        const componentName = path.basename(filePath, path.extname(filePath));
        
        errors.push({
          component: componentName,
          filePath: `src/${filePath}`,
          error: {
            type: 'TYPESCRIPT',
            code: errorCode,
            message: message.trim(),
            line: parseInt(lineNum),
            column: parseInt(column),
            severity: 'error'
          }
        });
      }
    }
    
    return errors;
  }

  /**
   * Parse TypeScript errors
   */
  private parseTypeScriptErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // TypeScript error format: src/components/Component.tsx(15,8): error TS2307: Cannot find module './Dependency'
      const match = line.match(/(.+)\((\d+),(\d+)\):\s*error\s+(.+):\s*(.+)/);
      if (match) {
        const [, filePath, lineNum, column, errorCode, message] = match;
        const componentName = path.basename(filePath, path.extname(filePath));
        
        errors.push({
          component: componentName,
          filePath,
          error: {
            type: 'TYPESCRIPT',
            code: errorCode,
            message: message.trim(),
            line: parseInt(lineNum),
            column: parseInt(column),
            severity: 'error'
          }
        });
      }
    }
    
    return errors;
  }

  /**
   * Parse generic build errors
   */
  private parseGenericBuildErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('error') && line.includes(':')) {
        // Try to extract component name from file path
        const fileMatch = line.match(/([^\/\\]+)\.(tsx?|jsx?)/);
        if (fileMatch) {
          const componentName = fileMatch[1];
          
          errors.push({
            component: componentName,
            filePath: 'unknown',
            error: {
              type: 'BUILD',
              code: 'BUILD_ERROR',
              message: line.trim(),
              severity: 'error'
            }
          });
        }
      }
    }
    
    return errors;
  }

  /**
   * Get list of fixed components
   */
  private getFixedComponents(): string[] {
    const fixedComponents = new Set<string>();
    
    for (const history of this.buildHistory) {
      if (history.errorsFixed > 0) {
        // Add components that were fixed in this build
        // This is a simplified approach - in practice you'd track which specific components were fixed
        const components = this.graphFixer.getComponentFixer().getRegisteredComponents();
        components.forEach(component => fixedComponents.add(component));
      }
    }
    
    return Array.from(fixedComponents);
  }

  /**
   * Get build statistics
   */
  getBuildStats(): BuildStats {
    return {
      totalBuilds: this.buildHistory.length,
      successfulBuilds: this.buildHistory.filter(h => h.errorsFixed === 0).length,
      totalErrorsFixed: this.buildHistory.reduce((sum, h) => sum + h.errorsFixed, 0),
      averageBuildTime: this.buildHistory.reduce((sum, h) => sum + h.buildTime, 0) / this.buildHistory.length,
      maxAttemptsReached: this.buildHistory.length >= this.maxGlobalAttempts
    };
  }

  /**
   * Get error memory statistics
   */
  getErrorMemoryStats(): ErrorMemoryStats {
    return this.graphFixer.getErrorMemoryStats();
  }

  /**
   * Clear build memory
   */
  clearBuildMemory(): void {
    this.buildMemory.clear();
    this.fixAttempts.clear();
    this.buildHistory = [];
  }
}

// Types for recursive build fixing
export interface BuildError {
  component: string;
  filePath: string;
  error: ComponentError;
}

export interface PrioritizedError {
  component: string;
  error: BuildError;
  priority: number;
  depth: number;
}

export interface GlobalBuildResult {
  success: boolean;
  buildTime: number;
  errors: BuildError[];
  output: string;
}

export interface PrioritizedFixResult {
  success: boolean;
  errorsFixed: number;
  componentsFixed: string[];
}

export interface RecursiveBuildFixResult {
  success: boolean;
  globalAttempts: number;
  totalFixed: number;
  totalErrors: number;
  buildHistory: BuildHistory[];
  finalBuildTime: number;
  componentsFixed: string[];
  maxAttemptsReached?: boolean;
}

export interface BuildHistory {
  attempt: number;
  timestamp: string;
  buildTime: number;
  totalErrors: number;
  errorsFixed: number;
  prioritizedErrors: Array<{
    component: string;
    error: string;
    priority: number;
  }>;
}

export interface BuildStats {
  totalBuilds: number;
  successfulBuilds: number;
  totalErrorsFixed: number;
  averageBuildTime: number;
  maxAttemptsReached: boolean;
}

export interface ErrorMemoryStats {
  totalFingerprints: number;
  totalErrors: number;
  uniqueErrorTypes: number;
} 