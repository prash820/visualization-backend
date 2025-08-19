import { BuildResult, BuildState, ErrorGroup, FixRequest, BuildError } from './buildFix/types';
import { installDependenciesWithRetries } from './buildFix/dependencyInstaller';
import { runBuildAndCollectErrors } from './buildFix/buildRunner';
import { groupErrorsByDependencies } from './buildFix/errorGrouper';
import { generateAIFix } from './buildFix/aiFixer';
import { EnhancedErrorFixer } from './buildFix/enhancedErrorFixer';
import fs from 'fs/promises';
import path from 'path';

export class BuildFixService {
  private maxInstallRetries = 3;
  private maxBuildRetries = 10;

  async runBuildAndFixPipeline(projectPath: string, jobId: string): Promise<BuildResult> {
    const state: BuildState = {
      projectPath,
      jobId,
      installRetries: 0,
      buildRetries: 0,
      totalFixedFiles: [],
      allLogs: [],
      currentErrorGroups: [],
      fixedErrorGroups: [],
      maxInstallRetries: this.maxInstallRetries,
      maxBuildRetries: this.maxBuildRetries
    };

    // Step 1: Install dependencies with retries
    const installResult = await installDependenciesWithRetries(projectPath, this.maxInstallRetries, state.allLogs);
    state.allLogs.push(...installResult.logs);
    if (!installResult.success) {
      return {
        success: false,
        errors: installResult.errors,
        warnings: installResult.warnings,
        logs: state.allLogs,
        fixedFiles: state.totalFixedFiles,
        retryCount: state.installRetries
      };
    }

    // Step 2: Build and fix with enhanced error fixer
    return await this.buildAndFixWithEnhancedFixer(state);
  }

  private async buildAndFixWithEnhancedFixer(state: BuildState): Promise<BuildResult> {
    let buildRetries = 0;
    
    while (buildRetries < state.maxBuildRetries) {
      buildRetries++;
      state.allLogs.push(`[BuildFix] Attempt ${buildRetries}/${state.maxBuildRetries}`);
      
      // Run build and collect errors
      const buildResult = await runBuildAndCollectErrors(state.projectPath);
      state.allLogs.push(...buildResult.logs);
      
      if (buildResult.success) {
        state.allLogs.push(`[BuildFix] Build successful on attempt ${buildRetries}`);
        return {
          success: true,
          errors: [],
          warnings: buildResult.warnings,
          logs: state.allLogs,
          fixedFiles: state.totalFixedFiles,
          retryCount: buildRetries
        };
      }

      // Use enhanced error fixer
      state.allLogs.push(`[BuildFix] Build failed with ${buildResult.errors.length} errors. Starting enhanced error fixing...`);
      
      const enhancedFixer = new EnhancedErrorFixer(state.projectPath, state.jobId);
      const fixResult = await enhancedFixer.fixErrorsIteratively(buildResult.errors);
      
      // Add enhanced fixer logs
      state.allLogs.push(...fixResult.logs);
      
      if (fixResult.success && fixResult.fixedFiles.length > 0) {
        state.totalFixedFiles.push(...fixResult.fixedFiles);
        state.allLogs.push(`[BuildFix] Enhanced error fixer fixed ${fixResult.fixedFiles.length} files`);
        
        // Get detailed report
        const report = enhancedFixer.getErrorFixingReport();
        state.allLogs.push(`[BuildFix] Error fixing report: ${report.fixedFiles}/${report.totalFiles} files fixed`);
        
        // Log detailed error file mapping for debugging
        for (const [filePath, mapping] of report.errorFileMap) {
          state.allLogs.push(`[BuildFix] ${filePath}: ${mapping.errors.length} errors, priority ${mapping.priority}, ${mapping.fixAttempts} attempts`);
          for (const attempt of mapping.fixHistory) {
            state.allLogs.push(`[BuildFix]   - ${attempt.timestamp.toISOString()}: ${attempt.success ? 'SUCCESS' : 'FAILED'} - ${attempt.errorMessages.join(', ')}`);
          }
        }
        
        // Continue to next build attempt
        continue;
      } else {
        state.allLogs.push(`[BuildFix] Enhanced error fixer could not fix any errors`);
        
        // If no errors were fixed, we're stuck
        return {
          success: false,
          errors: buildResult.errors,
          warnings: buildResult.warnings,
          logs: state.allLogs,
          fixedFiles: state.totalFixedFiles,
          retryCount: buildRetries
        };
      }
    }

    // Max retries reached
    state.allLogs.push(`[BuildFix] Max build retries (${state.maxBuildRetries}) reached`);
    return {
      success: false,
      errors: [],
      warnings: [],
      logs: state.allLogs,
      fixedFiles: state.totalFixedFiles,
      retryCount: buildRetries
    };
  }
}

export const buildFixService = new BuildFixService(); 