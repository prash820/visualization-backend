import { BuildError, ErrorGroup, BuildState, FixRequest, AIFixResult } from './types';
import { generateAIFix } from './aiFixer';
import fs from 'fs/promises';
import path from 'path';
import { anthropic, ANTHROPIC_MODEL } from '../../config/aiProvider';

export interface ErrorFileMapping {
  filePath: string;
  errors: BuildError[];
  lineErrors: Map<number, BuildError[]>; // Line-specific error mapping
  dependencies: string[]; // Files that depend on this file
  dependents: string[]; // Files this file depends on
  affectedDependents: string[]; // Files that will be affected by changes
  priority: number;
  fixAttempts: number;
  lastFixAttempt?: Date;
  fixHistory: FixAttempt[];
  surgicalChanges: SurgicalChange[]; // Track specific line changes
}

export interface SurgicalChange {
  lineNumber: number;
  originalLine: string;
  fixedLine: string;
  errorMessages: string[];
  timestamp: Date;
  dependentFilesAffected: string[];
}

export interface LineErrorContext {
  lineNumber: number;
  lineContent: string;
  errors: BuildError[];
  surroundingContext: string[]; // Lines before and after for context
  dependentFiles: string[];
  methodContext?: string; // Method/class context
}

export interface FixAttempt {
  timestamp: Date;
  errorMessages: string[];
  fixApplied: string;
  success: boolean;
  dependentFilesUpdated: string[];
  logs: string[];
}

export interface DependencyGraph {
  [filePath: string]: {
    imports: string[];
    exports: string[];
    dependencies: string[];
    dependents: string[];
  };
}

export interface CodePlanStructure {
  fileStructure: {
    frontend: Array<{
      path: string;
      dependencies: string[];
      description: string;
      type: string;
      hasExistingContent?: boolean;
    }>;
    backend: Array<{
      path: string;
      dependencies: string[];
      description: string;
      type: string;
      hasExistingContent?: boolean;
    }>;
  };
}

export class EnhancedErrorFixer {
  private errorFileMap: Map<string, ErrorFileMapping> = new Map();
  private dependencyGraph: DependencyGraph = {};
  private fixLogs: string[] = [];
  private maxFixAttempts = 3;
  private codePlanStructure?: CodePlanStructure;

  constructor(private projectPath: string, private jobId: string) {}

  /**
   * Load code plan structure to understand the intended file organization
   */
  private async loadCodePlanStructure(): Promise<void> {
    try {
      const backendCodePlanPath = path.join(this.projectPath, 'backend-codeplan.json');
      const frontendCodePlanPath = path.join(this.projectPath, 'frontend-codeplan.json');
      
      let backendCodePlan = null;
      let frontendCodePlan = null;
      
      try {
        const backendContent = await fs.readFile(backendCodePlanPath, 'utf-8');
        backendCodePlan = JSON.parse(backendContent);
      } catch (error) {
        this.log(`⚠️ No backend code plan found: ${error}`);
      }
      
      try {
        const frontendContent = await fs.readFile(frontendCodePlanPath, 'utf-8');
        frontendCodePlan = JSON.parse(frontendContent);
      } catch (error) {
        this.log(`⚠️ No frontend code plan found: ${error}`);
      }
      
      this.codePlanStructure = {
        fileStructure: {
          frontend: frontendCodePlan?.fileStructure?.frontend || [],
          backend: backendCodePlan?.fileStructure?.backend || []
        }
      };
      
      this.log(`📋 Loaded code plan structure: ${this.codePlanStructure.fileStructure.backend.length} backend files, ${this.codePlanStructure.fileStructure.frontend.length} frontend files`);
      
      // CRITICAL: Check if files already exist and have content
      await this.validateExistingCode();
      
    } catch (error) {
      this.log(`⚠️ Error loading code plan structure: ${error}`);
    }
  }

  /**
   * Validate that existing code in code plan is not overwritten
   */
  private async validateExistingCode(): Promise<void> {
    if (!this.codePlanStructure) return;
    
    this.log(`🔍 Validating existing code in project files...`);
    
    for (const backendFile of this.codePlanStructure.fileStructure.backend) {
      const filePath = path.join(this.projectPath, backendFile.path);
      
      try {
        // Check if file exists and has content
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
        
        if (fileExists) {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const hasContent = fileContent.trim().length > 0;
          
          if (hasContent) {
            this.log(`✅ File exists with content: ${backendFile.path}`);
            // Mark this file as having existing content to prevent regeneration
            backendFile.hasExistingContent = true;
          } else {
            this.log(`⚠️ File exists but is empty: ${backendFile.path}`);
          }
        } else {
          this.log(`📄 File does not exist: ${backendFile.path}`);
        }
      } catch (error) {
        this.log(`❌ Error checking file ${backendFile.path}: ${error}`);
      }
    }
    
    // CRITICAL: Validate file structure against code plan
    await this.validateFileStructureAgainstCodePlan();
  }

  /**
   * Validate file structure against code plan instead of cleaning up
   */
  private async validateFileStructureAgainstCodePlan(): Promise<void> {
    this.log(`🔍 Validating file structure against code plan...`);
    
    if (!this.codePlanStructure) {
      this.log(`⚠️ No code plan structure available for validation`);
      return;
    }
    
    const backendFiles = this.codePlanStructure.fileStructure.backend;
    const expectedPaths = new Set(backendFiles.map(f => f.path));
    
    try {
      const srcPath = path.join(this.projectPath, 'src');
      if (!(await fs.access(srcPath).then(() => true).catch(() => false))) {
        this.log(`📁 No src directory found - this is expected for new projects`);
        return;
      }
      
      const items = await fs.readdir(srcPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isDirectory()) {
          const itemPath = path.join(srcPath, item.name);
          const subItems = await fs.readdir(itemPath, { withFileTypes: true });
          
          for (const subItem of subItems) {
            if (subItem.isFile()) {
              const relativePath = `src/${item.name}/${subItem.name}`;
              
              // Check if this file is in the expected location according to code plan
              if (!expectedPaths.has(relativePath)) {
                this.log(`⚠️ File not in expected location according to code plan: ${relativePath}`);
                
                // Check if it should be moved to match code plan structure
                const shouldBeInDifferentLocation = this.findExpectedLocationInCodePlan(subItem.name, backendFiles);
                if (shouldBeInDifferentLocation) {
                  this.log(`💡 File ${subItem.name} should be in: ${shouldBeInDifferentLocation} according to code plan`);
                }
              } else {
                this.log(`✅ File in correct location: ${relativePath}`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      this.log(`⚠️ Error during file structure validation: ${error.message}`);
    }
  }

  /**
   * Find the expected location of a file according to the code plan
   */
  private findExpectedLocationInCodePlan(fileName: string, backendFiles: any[]): string | null {
    // Look for files with the same name in the code plan
    const matchingFiles = backendFiles.filter(f => path.basename(f.path) === fileName);
    
    if (matchingFiles.length > 0) {
      return matchingFiles[0].path;
    }
    
    // Look for files with similar names
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const similarFiles = backendFiles.filter(f => {
      const fName = path.basename(f.path).replace(/\.[^/.]+$/, '');
      return fName === fileNameWithoutExt || fName.includes(fileNameWithoutExt) || fileNameWithoutExt.includes(fName);
    });
    
    if (similarFiles.length > 0) {
      return similarFiles[0].path;
    }
    
    return null;
  }

  /**
   * Main entry point for enhanced error fixing
   */
  async fixErrorsIteratively(errors: BuildError[]): Promise<{
    success: boolean;
    fixedFiles: string[];
    logs: string[];
    errorFileMap: Map<string, ErrorFileMapping>;
  }> {
    this.log(`🚀 Starting enhanced error fixing for ${errors.length} errors`);
    
    // Step 0: Load code plan structure
    await this.loadCodePlanStructure();
    
    // Step 1: Map errors to files
    await this.mapErrorsToFiles(errors);
    
    // Step 2: Build dependency graph from code plan
    await this.buildDependencyGraphFromCodePlan();
    
    // Step 3: Calculate priorities based on dependencies
    this.calculatePriorities();
    
    // Step 4: Fix errors iteratively in priority order
    const fixedFiles = await this.fixErrorsInPriorityOrder();
    
    this.log(`✅ Enhanced error fixing completed. Fixed ${fixedFiles.length} files`);
    
    return {
      success: fixedFiles.length > 0,
      fixedFiles,
      logs: this.fixLogs,
      errorFileMap: this.errorFileMap
    };
  }

  /**
   * Step 1: Map errors to files with detailed line-specific information
   */
  private async mapErrorsToFiles(errors: BuildError[]): Promise<void> {
    this.log(`📋 Mapping ${errors.length} errors to files with line-specific tracking...`);
    
    for (const error of errors) {
      let filePath = error.file;
      
      // Handle errors without file paths by extracting from message or context
      if (!filePath) {
        filePath = this.extractFilePathFromError(error);
        if (!filePath) {
          this.log(`⚠️ Skipping error without file: ${error.message}`);
          continue;
        }
      }

      const normalizedFilePath = this.normalizeFilePath(filePath);
      
      if (!this.errorFileMap.has(normalizedFilePath)) {
        this.errorFileMap.set(normalizedFilePath, {
          filePath: normalizedFilePath,
          errors: [],
          lineErrors: new Map(),
          dependencies: [],
          dependents: [],
          affectedDependents: [],
          priority: 0,
          fixAttempts: 0,
          fixHistory: [],
          surgicalChanges: []
        });
      }

      const mapping = this.errorFileMap.get(normalizedFilePath)!;
      mapping.errors.push(error);
      
      // Track line-specific errors
      if (error.line) {
        if (!mapping.lineErrors.has(error.line)) {
          mapping.lineErrors.set(error.line, []);
        }
        mapping.lineErrors.get(error.line)!.push(error);
      }
      
      this.log(`📍 Mapped error to ${normalizedFilePath}:${error.line || '?'} - ${error.message.substring(0, 100)}...`);
    }

    // Analyze which dependent files will be affected by these errors
    await this.analyzeAffectedDependents();
    
    this.log(`📊 Error mapping complete: ${this.errorFileMap.size} files with errors, ${Array.from(this.errorFileMap.values()).reduce((sum, m) => sum + m.lineErrors.size, 0)} lines with errors`);
  }

  /**
   * Extract file path from error message or context
   */
  private extractFilePathFromError(error: BuildError): string | undefined {
    const message = error.message;
    
    // Try to extract file path from common error patterns
    const patterns = [
      /Build errors in ([\w\/\-\.]+):/,
      /Error in ([\w\/\-\.]+):/,
      /File ([\w\/\-\.]+) has errors/,
      /([\w\/\-\.]+\.ts) has compilation errors/,
      /([\w\/\-\.]+\.tsx?) line \d+/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If no pattern matches, try to infer from code plan structure
    if (this.codePlanStructure) {
      // Look for backend files that might have errors
      const backendFiles = this.codePlanStructure.fileStructure.backend;
      if (backendFiles.length > 0) {
        // Return the first backend file as a fallback
        return backendFiles[0].path;
      }
    }
    
    return undefined;
  }

  /**
   * Analyze which dependent files will be affected by the errors
   */
  private async analyzeAffectedDependents(): Promise<void> {
    this.log(`🔍 Analyzing affected dependent files...`);
    
    for (const [filePath, mapping] of this.errorFileMap) {
      const affectedDependents = new Set<string>();
      
      // Get all dependents of this file
      const dependents = this.dependencyGraph[filePath]?.dependents || [];
      
      for (const dependent of dependents) {
        // Check if the dependent imports/uses anything that might be affected by the errors
        const willBeAffected = await this.checkIfDependentWillBeAffected(dependent, filePath, mapping.errors);
        if (willBeAffected) {
          affectedDependents.add(dependent);
        }
      }
      
      mapping.affectedDependents = Array.from(affectedDependents);
      this.log(`📊 ${filePath}: ${mapping.affectedDependents.length} dependents will be affected by changes`);
    }
  }

  /**
   * Check if a dependent file will be affected by changes to the source file
   */
  private async checkIfDependentWillBeAffected(dependentPath: string, sourcePath: string, errors: BuildError[]): Promise<boolean> {
    try {
      const dependentFilePath = path.join(this.projectPath, dependentPath);
      const dependentContent = await fs.readFile(dependentFilePath, 'utf-8');
      
      // Check if dependent imports from the source file
      const importsFromSource = this.checkImportsFromFile(dependentContent, sourcePath);
      if (!importsFromSource) {
        return false;
      }
      
      // Check if any of the errors affect exported symbols that the dependent uses
      for (const error of errors) {
        const affectedSymbol = this.extractAffectedSymbol(error);
        if (affectedSymbol && this.checkIfDependentUsesSymbol(dependentContent, affectedSymbol)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.log(`⚠️ Error checking dependent ${dependentPath}: ${error}`);
      return false;
    }
  }

  /**
   * Check if a file imports from another file
   */
  private checkImportsFromFile(content: string, sourcePath: string): boolean {
    const sourceFileName = path.basename(sourcePath, path.extname(sourcePath));
    const importRegex = new RegExp(`import\\s+.*?\\s+from\\s+['"][^'"]*${sourceFileName}[^'"]*['"]`, 'g');
    return importRegex.test(content);
  }

  /**
   * Extract the symbol that might be affected by an error
   */
  private extractAffectedSymbol(error: BuildError): string | null {
    const message = error.message;
    
    // Extract class/method/property names from common error patterns
    const patterns = [
      /Property '(\w+)' does not exist/,
      /Method '(\w+)' does not exist/,
      /Type '(\w+)' is not assignable/,
      /Cannot find name '(\w+)'/,
      /has no exported member '(\w+)'/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Check if dependent content uses a specific symbol
   */
  private checkIfDependentUsesSymbol(content: string, symbol: string): boolean {
    // Check for direct usage of the symbol
    const usagePatterns = [
      new RegExp(`\\b${symbol}\\b`, 'g'), // Direct usage
      new RegExp(`\\.${symbol}\\b`, 'g'), // Property access
      new RegExp(`${symbol}\\(`, 'g')     // Method call
    ];
    
    return usagePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Step 2: Build dependency graph from code plan instead of analyzing files
   */
  private async buildDependencyGraphFromCodePlan(): Promise<void> {
    this.log(`🔗 Building dependency graph from code plan...`);
    
    if (!this.codePlanStructure) {
      this.log(`⚠️ No code plan structure available, skipping dependency graph`);
      return;
    }
    
    // Initialize dependency graph for all files in code plan
    const allFiles = [
      ...this.codePlanStructure.fileStructure.backend.map(f => f.path),
      ...this.codePlanStructure.fileStructure.frontend.map(f => f.path)
    ];
    
    for (const filePath of allFiles) {
      this.dependencyGraph[filePath] = {
        imports: [],
        exports: [],
        dependencies: [],
        dependents: []
      };
    }
    
    // Build dependencies from code plan
    for (const backendFile of this.codePlanStructure.fileStructure.backend) {
      const filePath = backendFile.path;
      const dependencies = backendFile.dependencies || [];
      
      this.dependencyGraph[filePath] = {
        imports: dependencies,
        exports: [],
        dependencies: dependencies,
        dependents: []
      };
    }
    
    for (const frontendFile of this.codePlanStructure.fileStructure.frontend) {
      const filePath = frontendFile.path;
      const dependencies = frontendFile.dependencies || [];
      
      this.dependencyGraph[filePath] = {
        imports: dependencies,
        exports: [],
        dependencies: dependencies,
        dependents: []
      };
    }
    
    // Build dependents relationships
    for (const [filePath, graph] of Object.entries(this.dependencyGraph)) {
      for (const dependency of graph.dependencies) {
        // Find the actual file path for the dependency
        const actualDependencyPath = this.findActualFilePath(dependency, filePath);
        if (actualDependencyPath && this.dependencyGraph[actualDependencyPath]) {
          this.dependencyGraph[actualDependencyPath].dependents.push(filePath);
        }
      }
    }

    this.log(`🔗 Dependency graph built from code plan: ${Object.keys(this.dependencyGraph).length} files analyzed`);
  }

  /**
   * Find the actual file path for a dependency
   */
  private findActualFilePath(dependency: string, currentFilePath: string): string | null {
    // Handle relative imports like "../services/NotesService"
    if (dependency.startsWith('.')) {
      const currentDir = path.dirname(currentFilePath);
      const resolvedPath = path.join(currentDir, dependency);
      return resolvedPath.replace(/\\/g, '/');
    }
    
    // Handle absolute imports by searching in code plan
    if (this.codePlanStructure) {
      const allFiles = [
        ...this.codePlanStructure.fileStructure.backend,
        ...this.codePlanStructure.fileStructure.frontend
      ];
      
      // Try to find by filename
      const fileName = path.basename(dependency);
      const matchingFile = allFiles.find(f => path.basename(f.path) === fileName);
      if (matchingFile) {
        return matchingFile.path;
      }
      
      // Try to find by path
      const matchingPath = allFiles.find(f => f.path.includes(dependency));
      if (matchingPath) {
        return matchingPath.path;
      }
    }
    
    return null;
  }

  /**
   * Step 3: Calculate priorities based on dependency relationships
   */
  private calculatePriorities(): void {
    this.log(`⚖️ Calculating file priorities...`);
    
    for (const [filePath, mapping] of this.errorFileMap) {
      const graph = this.dependencyGraph[filePath] || { dependents: [], dependencies: [] };
      
      // Priority factors:
      // 1. Number of dependents (higher = more critical)
      // 2. Number of errors (higher = more critical)
      // 3. Whether it's a core file (models, services, etc.)
      
      const dependentsWeight = graph.dependents.length * 10;
      const errorsWeight = mapping.errors.length * 5;
      const coreFileWeight = this.isCoreFile(filePath) ? 20 : 0;
      
      mapping.priority = dependentsWeight + errorsWeight + coreFileWeight;
      mapping.dependents = graph.dependents;
      mapping.dependencies = graph.dependencies;
      
      this.log(`📊 ${filePath}: priority=${mapping.priority} (${graph.dependents.length} dependents, ${mapping.errors.length} errors)`);
    }
  }

  /**
   * Step 4: Fix errors in priority order
   */
  private async fixErrorsInPriorityOrder(): Promise<string[]> {
    const fixedFiles: string[] = [];
    const sortedFiles = Array.from(this.errorFileMap.values())
      .sort((a, b) => b.priority - a.priority);

    this.log(`🔧 Starting iterative fixes for ${sortedFiles.length} files...`);

    for (const mapping of sortedFiles) {
      if (mapping.fixAttempts >= this.maxFixAttempts) {
        this.log(`⚠️ Skipping ${mapping.filePath}: max fix attempts reached`);
        continue;
      }

      this.log(`🔧 Fixing ${mapping.filePath} (priority: ${mapping.priority}, errors: ${mapping.errors.length})`);
      
      const fixResult = await this.fixFileErrors(mapping);
      
      if (fixResult.success) {
        fixedFiles.push(mapping.filePath);
        this.log(`✅ Successfully fixed ${mapping.filePath}`);
        
        // Update dependent files if needed
        const dependentUpdates = await this.updateDependentFiles(mapping.filePath, fixResult.changes);
        if (dependentUpdates.length > 0) {
          this.log(`🔄 Updated ${dependentUpdates.length} dependent files`);
          fixedFiles.push(...dependentUpdates);
        }
      } else {
        this.log(`❌ Failed to fix ${mapping.filePath}: ${fixResult.error}`);
      }
    }

    return fixedFiles;
  }

  /**
   * Fix errors in a specific file using surgical approach
   */
  private async fixFileErrors(mapping: ErrorFileMapping): Promise<{
    success: boolean;
    error?: string;
    changes?: Record<string, any>;
  }> {
    try {
      mapping.fixAttempts++;
      mapping.lastFixAttempt = new Date();
      
      const filePath = path.join(this.projectPath, mapping.filePath);
      
      // CRITICAL: Check if file already has content from code plan
      const hasExistingContent = this.checkIfFileHasExistingContent(mapping.filePath);
      
      if (hasExistingContent) {
        this.log(`🛡️ File ${mapping.filePath} has existing content from code plan - applying surgical fixes only`);
        
        // Only apply surgical fixes to existing content, don't regenerate
        const originalContent = await fs.readFile(filePath, 'utf-8');
        const surgicalFixResult = await this.performSurgicalFix(mapping, originalContent);
        
        if (surgicalFixResult.success) {
          // Apply the surgical fix
          await fs.writeFile(filePath, surgicalFixResult.fixedContent, 'utf-8');
          
          const fixAttempt: FixAttempt = {
            timestamp: new Date(),
            errorMessages: mapping.errors.map(e => e.message),
            fixApplied: `Surgical fix to existing content: ${surgicalFixResult.changesApplied} changes`,
            success: true,
            dependentFilesUpdated: [],
            logs: [`Successfully applied surgical fix to existing content in ${mapping.filePath}`]
          };
          mapping.fixHistory.push(fixAttempt);
          
          this.log(`✅ Applied surgical fix to existing content in ${mapping.filePath}`);
          return { 
            success: true, 
            changes: { 
              content: surgicalFixResult.fixedContent,
              surgicalChanges: surgicalFixResult.changesApplied,
              preservedExistingContent: true
            } 
          };
        } else {
          this.log(`⚠️ Surgical fix failed for existing content in ${mapping.filePath}, skipping regeneration`);
          return { success: false, error: 'Surgical fix failed for existing content' };
        }
      } else {
        this.log(`📝 File ${mapping.filePath} has no existing content - applying full fix`);
        
        // File doesn't exist or is empty, apply full fix
        const originalContent = await fs.readFile(filePath, 'utf-8').catch(() => '');
        
        // Use surgical approach: fix specific error lines instead of entire file
        const surgicalFixResult = await this.performSurgicalFix(mapping, originalContent);
        
        if (surgicalFixResult.success) {
          // Apply the surgical fix
          await fs.writeFile(filePath, surgicalFixResult.fixedContent, 'utf-8');
          
          const fixAttempt: FixAttempt = {
            timestamp: new Date(),
            errorMessages: mapping.errors.map(e => e.message),
            fixApplied: `Surgical fix: ${surgicalFixResult.changesApplied} changes`,
            success: true,
            dependentFilesUpdated: [],
            logs: [`Successfully applied surgical fix to ${mapping.filePath}`]
          };
          mapping.fixHistory.push(fixAttempt);
          
          this.log(`✅ Applied surgical fix to ${mapping.filePath}`);
          return { 
            success: true, 
            changes: { 
              content: surgicalFixResult.fixedContent,
              surgicalChanges: surgicalFixResult.changesApplied
            } 
          };
        } else {
          // Fallback to AI fix only if surgical approach fails
          this.log(`⚠️ Surgical fix failed, trying AI fix for ${mapping.filePath}...`);
          return await this.performAIFix(mapping, originalContent);
        }
      }

    } catch (error: any) {
      const fixAttempt: FixAttempt = {
        timestamp: new Date(),
        errorMessages: mapping.errors.map(e => e.message),
        fixApplied: 'Exception during fix',
        success: false,
        dependentFilesUpdated: [],
        logs: [`Exception: ${error.message}`]
      };
      mapping.fixHistory.push(fixAttempt);
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a file has existing content from the code plan
   */
  private checkIfFileHasExistingContent(filePath: string): boolean {
    if (!this.codePlanStructure) return false;
    
    const backendFile = this.codePlanStructure.fileStructure.backend.find(f => f.path === filePath);
    if (backendFile) {
      return backendFile.hasExistingContent === true;
    }
    
    return false;
  }

  /**
   * Enhanced surgical fix with line-specific context and dependent file tracking
   */
  private async performSurgicalFix(mapping: ErrorFileMapping, originalContent: string): Promise<{
    success: boolean;
    fixedContent: string;
    changesApplied: string[];
  }> {
    this.log(`🔧 Performing surgical fix for ${mapping.filePath}`);
    
    let fixedContent = originalContent;
    const changesApplied: string[] = [];
    
    // CRITICAL: Fix import/export patterns first
    const importExportFixes = this.fixImportExportPatterns(fixedContent, mapping.filePath);
    if (importExportFixes.changes.length > 0) {
      fixedContent = importExportFixes.content;
      changesApplied.push(...importExportFixes.changes);
      this.log(`✅ Applied ${importExportFixes.changes.length} import/export fixes`);
    }
    
    // CRITICAL: Fix interface definitions
    const interfaceFixes = this.fixInterfaceDefinitions(fixedContent);
    if (interfaceFixes.changes.length > 0) {
      fixedContent = interfaceFixes.content;
      changesApplied.push(...interfaceFixes.changes);
      this.log(`✅ Applied ${interfaceFixes.changes.length} interface fixes`);
    }
    
    // Fix specific line errors
    for (const [lineNumber, errors] of mapping.lineErrors) {
      const lines = fixedContent.split('\n');
      const lineIndex = lineNumber - 1;
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const originalLine = lines[lineIndex];
        let fixedLine = originalLine;
        
        for (const error of errors) {
          const lineFix = await this.fixSpecificLine(originalLine, [error], lineNumber);
          if (lineFix !== originalLine) {
            fixedLine = lineFix;
            changesApplied.push(`Line ${lineNumber}: ${error.message}`);
          }
        }
        
        if (fixedLine !== originalLine) {
          lines[lineIndex] = fixedLine;
          fixedContent = lines.join('\n');
        }
      }
    }
    
    return {
      success: changesApplied.length > 0,
      fixedContent,
      changesApplied
    };
  }

  /**
   * Fix import/export patterns to ensure consistency
   */
  private fixImportExportPatterns(content: string, filePath: string): { content: string; changes: string[] } {
    const changes: string[] = [];
    let fixedContent = content;
    
    // Fix default imports to named imports
    const importFixes = [
      { pattern: /import (\w+) from ['"]\.\.\/models\/(\w+)['"]/g, replacement: 'import { $1 } from \'../models/$2\'' },
      { pattern: /import (\w+) from ['"]\.\.\/services\/(\w+)['"]/g, replacement: 'import { $1 } from \'../services/$2\'' },
      { pattern: /import (\w+) from ['"]\.\.\/repositories\/(\w+)['"]/g, replacement: 'import { $1 } from \'../repositories/$2\'' },
      { pattern: /import (\w+) from ['"]\.\/controllers\/(\w+)['"]/g, replacement: 'import { $1 } from \'./controllers/$2\'' }
    ];
    
    for (const fix of importFixes) {
      if (fix.pattern.test(fixedContent)) {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
        changes.push('Fixed default imports to named imports');
      }
    }
    
    // Fix default exports to named exports
    const exportFixes = [
      { pattern: /export default class (\w+)/g, replacement: 'export class $1' },
      { pattern: /export default interface (\w+)/g, replacement: 'export interface $1' }
    ];
    
    for (const fix of exportFixes) {
      if (fix.pattern.test(fixedContent)) {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
        changes.push('Fixed default exports to named exports');
      }
    }
    
    return { content: fixedContent, changes };
  }

  /**
   * Fix interface definitions to be simple
   */
  private fixInterfaceDefinitions(content: string): { content: string; changes: string[] } {
    const changes: string[] = [];
    let fixedContent = content;
    
    // Replace complex interfaces with simple ones
    const interfaceFixes = [
      {
        pattern: /export interface Note \{[\s\S]*?\}/g,
        replacement: `export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}`
      },
      {
        pattern: /export interface User \{[\s\S]*?\}/g,
        replacement: `export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}`
      }
    ];
    
    for (const fix of interfaceFixes) {
      if (fix.pattern.test(fixedContent)) {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
        changes.push('Simplified interface definitions');
      }
    }
    
    return { content: fixedContent, changes };
  }

  /**
   * Build detailed line error contexts with surrounding code and method information
   */
  private async buildLineErrorContexts(mapping: ErrorFileMapping, lines: string[]): Promise<LineErrorContext[]> {
    const contexts: LineErrorContext[] = [];
    
    for (const [lineNumber, errors] of mapping.lineErrors) {
      const lineIndex = lineNumber - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) continue;
      
      const lineContent = lines[lineIndex];
      
      // Get surrounding context (3 lines before and after)
      const surroundingContext: string[] = [];
      for (let i = Math.max(0, lineIndex - 3); i <= Math.min(lines.length - 1, lineIndex + 3); i++) {
        if (i !== lineIndex) {
          surroundingContext.push(`${i + 1}: ${lines[i]}`);
        }
      }
      
      // Find method/class context
      const methodContext = this.findMethodContext(lines, lineIndex);
      
      // Get dependent files that will be affected
      const dependentFiles = mapping.affectedDependents.filter(dep => {
        const affectedSymbol = this.extractAffectedSymbol(errors[0]);
        return affectedSymbol && this.checkIfDependentUsesSymbol(lines.join('\n'), affectedSymbol);
      });
      
      contexts.push({
        lineNumber,
        lineContent,
        errors,
        surroundingContext,
        dependentFiles,
        methodContext
      });
    }
    
    return contexts;
  }

  /**
   * Find the method/class context for a given line
   */
  private findMethodContext(lines: string[], lineIndex: number): string | undefined {
    // Look backwards to find the method/class declaration
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Check for method declaration
      if (line.match(/^\s*(public|private|protected)?\s*(async\s+)?\w+\s*\([^)]*\)\s*[:{]/)) {
        return line;
      }
      
      // Check for class declaration
      if (line.match(/^\s*(export\s+)?(class|interface)\s+\w+/)) {
        return line;
      }
      
      // Stop if we hit another class/interface
      if (line.match(/^\s*(class|interface)\s+\w+/)) {
        break;
      }
    }
    
    return undefined;
  }

  /**
   * Perform AI-powered surgical fix with full context
   */
  private async performAISurgicalFix(context: LineErrorContext, originalLine: string): Promise<string> {
    try {
      const prompt = this.buildSurgicalFixPrompt(context, originalLine);
      
      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const aiResponse = response.content[0].type === 'text' ? response.content[0].text : '';
      
      if (aiResponse && aiResponse.trim()) {
        // Extract the fixed line from AI response
        const fixedLine = this.extractFixedLineFromAIResponse(aiResponse, originalLine);
        if (fixedLine) {
          this.log(`🤖 AI surgical fix for line ${context.lineNumber}: ${originalLine.trim()} → ${fixedLine.trim()}`);
          return fixedLine;
        }
      }
      
      // Fallback to rule-based fixes
      return this.fixSpecificLine(originalLine, context.errors, context.lineNumber);
      
    } catch (error) {
      this.log(`⚠️ AI surgical fix failed for line ${context.lineNumber}, using rule-based fix: ${error}`);
      return this.fixSpecificLine(originalLine, context.errors, context.lineNumber);
    }
  }

  /**
   * Build detailed prompt for AI surgical fix
   */
  private buildSurgicalFixPrompt(context: LineErrorContext, originalLine: string): string {
    const { lineNumber, lineContent, errors, surroundingContext, dependentFiles, methodContext } = context;
    
    let prompt = `You are an expert TypeScript developer. Fix the specific line with errors while maintaining the existing code structure.

**FILE CONTEXT:**
- Line ${lineNumber}: ${lineContent}
- Method/Class: ${methodContext || 'Unknown'}

**ERRORS TO FIX:**
${errors.map(e => `- ${e.message}`).join('\n')}

**SURROUNDING CODE CONTEXT:**
${surroundingContext.join('\n')}

**DEPENDENT FILES THAT WILL BE AFFECTED:**
${dependentFiles.length > 0 ? dependentFiles.join(', ') : 'None'}

**REQUIREMENTS:**
1. Fix ONLY the specific line with errors
2. Maintain the existing code structure and style
3. Ensure the fix works with dependent files
4. Use proper TypeScript types and syntax
5. Keep the fix minimal and surgical

**ORIGINAL LINE:**
${originalLine}

**FIXED LINE (return only the corrected line):**`;

    return prompt;
  }

  /**
   * Extract the fixed line from AI response
   */
  private extractFixedLineFromAIResponse(aiResponse: string, originalLine: string): string | null {
    // Clean the response
    const cleaned = aiResponse.trim().replace(/```typescript?\n?/g, '').replace(/```\n?/g, '');
    
    // Try to find the fixed line
    const lines = cleaned.split('\n');
    
    // Look for a line that's different from the original
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed !== originalLine.trim() && !trimmed.startsWith('//')) {
        return trimmed;
      }
    }
    
    // If no clear fix found, return null to use rule-based fix
    return null;
  }

  /**
   * Fix a specific line based on error types
   */
  private async fixSpecificLine(originalLine: string, errors: BuildError[], lineNumber: number): Promise<string> {
    let fixedLine = originalLine;

    for (const error of errors) {
      const errorMessage = error.message.toLowerCase();
      
      // Type assignment errors
      if (errorMessage.includes('type') && errorMessage.includes('not assignable')) {
        fixedLine = this.fixTypeAssignmentError(fixedLine, error);
      }
      // Missing property errors
      else if (errorMessage.includes('property') && errorMessage.includes('does not exist')) {
        fixedLine = this.fixMissingPropertyError(fixedLine, error);
      }
      // Argument count errors
      else if (errorMessage.includes('expected') && errorMessage.includes('arguments')) {
        fixedLine = this.fixArgumentCountError(fixedLine, error);
      }
      // Import/export errors
      else if (errorMessage.includes('cannot find module') || errorMessage.includes('has no exported member')) {
        fixedLine = this.fixImportExportError(fixedLine, error);
      }
      // Method call errors
      else if (errorMessage.includes('does not exist on type')) {
        fixedLine = this.fixMethodCallError(fixedLine, error);
      }
      // Date to string conversion errors
      else if (errorMessage.includes('date') && errorMessage.includes('string')) {
        fixedLine = this.fixDateToStringError(fixedLine, error);
      }
    }

    return fixedLine;
  }

  /**
   * Fix type assignment errors
   */
  private fixTypeAssignmentError(line: string, error: BuildError): string {
    // Handle Date to string conversion
    if (line.includes('new Date()') && error.message.includes('string')) {
      return line.replace(/new Date\(\)/g, 'new Date().toISOString()');
    }
    
    // Handle type assertions
    if (line.includes('as any')) {
      return line; // Already has type assertion
    }
    
    // Add type assertion for complex types
    if (line.includes(':')) {
      return line.replace(/(\w+):\s*([^=]+)=/, '$1: $2 = $1 as any');
    }
    
    return line;
  }

  /**
   * Fix missing property errors
   */
  private fixMissingPropertyError(line: string, error: BuildError): string {
    // Extract property name from error message
    const propertyMatch = error.message.match(/property '(\w+)' does not exist/);
    if (propertyMatch) {
      const propertyName = propertyMatch[1];
      // Add the missing property with a default value
      if (line.includes('{') && line.includes('}')) {
        return line.replace(/{([^}]*)}/, `{$1, ${propertyName}: undefined}`);
      }
    }
    return line;
  }

  /**
   * Fix argument count errors
   */
  private fixArgumentCountError(line: string, error: BuildError): string {
    // Extract expected vs actual argument count
    const expectedMatch = error.message.match(/expected (\d+)/);
    const actualMatch = error.message.match(/but got (\d+)/);
    
    if (expectedMatch && actualMatch) {
      const expected = parseInt(expectedMatch[1]);
      const actual = parseInt(actualMatch[1]);
      
      if (actual < expected) {
        // Add missing arguments with undefined
        const missingArgs = Array(expected - actual).fill('undefined').join(', ');
        if (line.includes('(') && line.includes(')')) {
          return line.replace(/\(([^)]*)\)/, `($1${actual > 0 ? ', ' : ''}${missingArgs})`);
        }
      } else if (actual > expected) {
        // Remove extra arguments
        const args = line.match(/\(([^)]*)\)/);
        if (args) {
          const argList = args[1].split(',').slice(0, expected).join(',');
          return line.replace(/\([^)]*\)/, `(${argList})`);
        }
      }
    }
    
    return line;
  }

  /**
   * Fix import/export errors
   */
  private fixImportExportError(line: string, error: BuildError): string {
    // Handle missing @types packages
    if (line.includes('import') && error.message.includes('cannot find module')) {
      const moduleMatch = line.match(/from ['"]([^'"]+)['"]/);
      if (moduleMatch) {
        const moduleName = moduleMatch[1];
        // Try to fix common missing @types
        if (moduleName.includes('sequelize')) {
          return line.replace(/from ['"][^'"]+['"]/, "from 'sequelize'");
        }
      }
    }
    
    return line;
  }

  /**
   * Fix method call errors
   */
  private fixMethodCallError(line: string, error: BuildError): string {
    // Extract method name from error message
    const methodMatch = error.message.match(/property '(\w+)' does not exist/);
    if (methodMatch) {
      const methodName = methodMatch[1];
      
      // Handle common method name mismatches
      if (methodName === 'getAllNotes') {
        return line.replace(/\.getAllNotes\(\)/g, '.findAll()');
      }
      if (methodName === 'getNoteById') {
        return line.replace(/\.getNoteById\(/g, '.findByPk(');
      }
      if (methodName === 'createNote') {
        return line.replace(/\.createNote\(/g, '.create(');
      }
      if (methodName === 'updateNote') {
        return line.replace(/\.updateNote\(/g, '.update(');
      }
      if (methodName === 'deleteNote') {
        return line.replace(/\.deleteNote\(/g, '.destroy(');
      }
    }
    
    return line;
  }

  /**
   * Fix Date to string conversion errors
   */
  private fixDateToStringError(line: string, error: BuildError): string {
    return line.replace(/new Date\(\)/g, 'new Date().toISOString()');
  }

  /**
   * Fallback to AI fix for complex errors
   */
  private async performAIFix(mapping: ErrorFileMapping, originalContent: string): Promise<{
    success: boolean;
    error?: string;
    changes?: Record<string, any>;
  }> {
    // CRITICAL: Check if file has existing content from code plan
    const hasExistingContent = this.checkIfFileHasExistingContent(mapping.filePath);
    
    if (hasExistingContent) {
      this.log(`🛡️ Skipping AI fix for ${mapping.filePath} - file has existing content from code plan`);
      return { 
        success: false, 
        error: 'File has existing content from code plan - surgical fixes only allowed' 
      };
    }
    
    // Get context from dependent files using code plan
    const context = await this.buildFixContextFromCodePlan(mapping);
    
    const fixRequest: FixRequest = {
      error: mapping.errors[0], // Use first error as primary
      projectPath: this.projectPath,
      relevantCode: originalContent,
      context: `File: ${mapping.filePath}\nErrors:\n${mapping.errors.map(e => `- ${e.message}`).join('\n')}\n\nContext:\n${context}`,
      targetDirectory: path.dirname(path.join(this.projectPath, mapping.filePath))
    };

    this.log(`🤖 Requesting AI fix for ${mapping.filePath}...`);
    const aiResult = await generateAIFix(fixRequest, this.jobId);
    
    if (!aiResult.success) {
      const fixAttempt: FixAttempt = {
        timestamp: new Date(),
        errorMessages: mapping.errors.map(e => e.message),
        fixApplied: 'AI fix failed',
        success: false,
        dependentFilesUpdated: [],
        logs: [`AI fix failed: ${aiResult.error}`]
      };
      mapping.fixHistory.push(fixAttempt);
      
      return { success: false, error: aiResult.error };
    }

    // Apply the AI fix with proper path validation
    let changes: Record<string, any> = {};
    if (aiResult.fixedContent) {
      if (typeof aiResult.fixedContent === 'string') {
        changes = { content: aiResult.fixedContent };
      } else {
        for (const [fixFilePath, content] of Object.entries(aiResult.fixedContent)) {
          const validatedPath = this.validateAndFixFilePathUsingCodePlan(fixFilePath, mapping.filePath);
        
          // CRITICAL: Enhanced project boundary validation
          if (!this.validateProjectBoundary(validatedPath, this.projectPath)) {
            this.log(`❌ BLOCKED: File creation blocked for: ${validatedPath}`);
            continue;
          }
          
          // CRITICAL: Check if target file has existing content
          const targetHasExistingContent = this.checkIfFileHasExistingContent(validatedPath);
          if (targetHasExistingContent) {
            this.log(`🛡️ BLOCKED: Target file ${validatedPath} has existing content - skipping AI fix`);
            continue;
          }
          
          const fullPath = path.join(this.projectPath, validatedPath);
          
          this.log(`📁 Writing file to validated path: ${validatedPath}`);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, content, 'utf-8');
          changes[validatedPath] = content;
        }
      }
    }

    // Record the fix attempt
    const fixAttempt: FixAttempt = {
      timestamp: new Date(),
      errorMessages: mapping.errors.map(e => e.message),
      fixApplied: JSON.stringify(changes),
      success: true,
      dependentFilesUpdated: [],
      logs: [`Successfully applied AI fix to ${mapping.filePath}`]
    };
    mapping.fixHistory.push(fixAttempt);
    
    this.log(`✅ Applied AI fix to ${mapping.filePath}`);
    return { success: true, changes };
  }

  /**
   * Ensure CRUD completeness for repository and service classes
   */
  private async ensureCRUDCompleteness(filePath: string, content: string): Promise<string> {
    // CRITICAL: Check if file has existing content from code plan
    const hasExistingContent = this.checkIfFileHasExistingContent(filePath);
    
    if (hasExistingContent) {
      this.log(`🛡️ Skipping CRUD completeness for ${filePath} - file has existing content from code plan`);
      return content; // Return content unchanged
    }
    
    const fileName = path.basename(filePath, '.ts');
    
    // Check if this is a repository class
    if (fileName.includes('Repository')) {
      return this.ensureRepositoryCRUD(fileName, content);
    }
    
    // Check if this is a service class
    if (fileName.includes('Service')) {
      return this.ensureServiceCRUD(fileName, content);
    }
    
    // Check if this is a controller class
    if (fileName.includes('Controller')) {
      return this.ensureControllerCRUD(fileName, content);
    }
    
    return content;
  }

  /**
   * Ensure repository has all CRUD methods
   */
  private ensureRepositoryCRUD(className: string, content: string): string {
    const requiredMethods = [
      'getAll',
      'getById', 
      'create',
      'update',
      'delete'
    ];
    
    let updatedContent = content;
    const lines = content.split('\n');
    
    for (const method of requiredMethods) {
      if (!content.includes(`async ${method}`) && !content.includes(`static async ${method}`)) {
        // Add missing method
        const methodTemplate = this.getRepositoryMethodTemplate(className, method);
        updatedContent += `\n\n  static async ${methodTemplate}`;
      }
    }
    
    return updatedContent;
  }

  /**
   * Ensure service has all CRUD methods
   */
  private ensureServiceCRUD(className: string, content: string): string {
    const requiredMethods = [
      'getAllNotes',
      'getNoteById',
      'createNote',
      'updateNote', 
      'deleteNote'
    ];
    
    let updatedContent = content;
    
    for (const method of requiredMethods) {
      if (!content.includes(`async ${method}`) && !content.includes(`static async ${method}`)) {
        // Add missing method
        const methodTemplate = this.getServiceMethodTemplate(className, method);
        updatedContent += `\n\n  static async ${methodTemplate}`;
      }
    }
    
    return updatedContent;
  }

  /**
   * Ensure controller has all CRUD endpoints
   */
  private ensureControllerCRUD(className: string, content: string): string {
    const requiredEndpoints = [
      { method: 'get', path: '/', handler: 'getAllNotes' },
      { method: 'get', path: '/:id', handler: 'getNoteById' },
      { method: 'post', path: '/', handler: 'createNote' },
      { method: 'put', path: '/:id', handler: 'updateNote' },
      { method: 'delete', path: '/:id', handler: 'deleteNote' }
    ];
    
    let updatedContent = content;
    
    for (const endpoint of requiredEndpoints) {
      if (!content.includes(`router.${endpoint.method}('${endpoint.path}'`)) {
        // Add missing endpoint
        const endpointTemplate = this.getControllerEndpointTemplate(endpoint);
        updatedContent += `\n\n${endpointTemplate}`;
      }
    }
    
    return updatedContent;
  }

  /**
   * Get repository method template
   */
  private getRepositoryMethodTemplate(className: string, method: string): string {
    const entityName = className.replace('Repository', '');
    
    switch (method) {
      case 'getAll':
        return `getAll(): Promise<${entityName}[]> {
    // Database query to retrieve all ${entityName.toLowerCase()}s
    try {
      // TODO: Replace with actual database implementation
      // Example: return await Database.query('SELECT * FROM ${entityName.toLowerCase()}s');
      return [];
    } catch (error) {
      console.error('Error retrieving ${entityName.toLowerCase()}s:', error);
      throw error;
    }
  }`;
      
      case 'getById':
        return `getById(id: string): Promise<${entityName} | null> {
    // Database query to retrieve ${entityName.toLowerCase()} by ID
    try {
      // TODO: Replace with actual database implementation
      // Example: return await Database.query('SELECT * FROM ${entityName.toLowerCase()}s WHERE id = ?', [id]);
      return null;
    } catch (error) {
      console.error('Error retrieving ${entityName.toLowerCase()}:', error);
      throw error;
    }
  }`;
      
      case 'create':
        return `create(data: Partial<${entityName}>): Promise<${entityName}> {
    // Database query to create a new ${entityName.toLowerCase()}
    try {
      // TODO: Replace with actual database implementation
      // Example: const result = await Database.query('INSERT INTO ${entityName.toLowerCase()}s (content, createdAt) VALUES (?, ?)', [data.content, new Date()]);
      // return { id: result.insertId, ...data, createdAt: new Date() };
      return {
        id: Date.now().toString(),
        content: data.content || '',
        createdAt: new Date()
      } as ${entityName};
    } catch (error) {
      console.error('Error creating ${entityName.toLowerCase()}:', error);
      throw error;
    }
  }`;
      
      case 'update':
        return `update(id: string, data: Partial<${entityName}>): Promise<${entityName} | null> {
    // Database query to update ${entityName.toLowerCase()}
    try {
      // TODO: Replace with actual database implementation
      // Example: const result = await Database.query('UPDATE ${entityName.toLowerCase()}s SET content = ?, updatedAt = ? WHERE id = ?', [data.content, new Date(), id]);
      // if (result.affectedRows > 0) {
      //   return await this.getById(id);
      // }
      // return null;
      return {
        id,
        content: data.content || '',
        createdAt: new Date()
      } as ${entityName};
    } catch (error) {
      console.error('Error updating ${entityName.toLowerCase()}:', error);
      throw error;
    }
  }`;
      
      case 'delete':
        return `delete(id: string): Promise<boolean> {
    // Database query to delete ${entityName.toLowerCase()}
    try {
      // TODO: Replace with actual database implementation
      // Example: const result = await Database.query('DELETE FROM ${entityName.toLowerCase()}s WHERE id = ?', [id]);
      // return result.affectedRows > 0;
      return true;
    } catch (error) {
      console.error('Error deleting ${entityName.toLowerCase()}:', error);
      throw error;
    }
  }`;
      
      default:
        return `${method}(): Promise<any> {
    // TODO: Implement ${method}
    throw new Error('Method not implemented');
  }`;
    }
  }

  /**
   * Get service method template
   */
  private getServiceMethodTemplate(className: string, method: string): string {
    const entityName = className.replace('Service', '');
    
    switch (method) {
      case 'getAllNotes':
        return `getAllNotes(): Promise<Note[]> {
    try {
      // Business logic: Retrieve all notes with optional filtering/pagination
      const notes = await NotesRepository.getAll();
      return notes;
    } catch (error) {
      console.error('Error in getAllNotes:', error);
      throw error;
    }
  }`;
      
      case 'getNoteById':
        return `getNoteById(id: string): Promise<Note | null> {
    try {
      // Business logic: Validate ID and retrieve note
      if (!id || id.trim() === '') {
        throw new Error('Note ID is required');
      }
      const note = await NotesRepository.getById(id);
      return note;
    } catch (error) {
      console.error('Error in getNoteById:', error);
      throw error;
    }
  }`;
      
      case 'createNote':
        return `createNote(noteData: Partial<Note>): Promise<Note> {
    try {
      // Business logic: Validate note data and create note
      if (!noteData.content || noteData.content.trim() === '') {
        throw new Error('Note content is required');
      }
      const note = await NotesRepository.create(noteData);
      return note;
    } catch (error) {
      console.error('Error in createNote:', error);
      throw error;
    }
  }`;
      
      case 'updateNote':
        return `updateNote(id: string, noteData: Partial<Note>): Promise<Note | null> {
    try {
      // Business logic: Validate ID and update note
      if (!id || id.trim() === '') {
        throw new Error('Note ID is required');
      }
      if (!noteData.content || noteData.content.trim() === '') {
        throw new Error('Note content is required');
      }
      const note = await NotesRepository.update(id, noteData);
      return note;
    } catch (error) {
      console.error('Error in updateNote:', error);
      throw error;
    }
  }`;
      
      case 'deleteNote':
        return `deleteNote(id: string): Promise<boolean> {
    try {
      // Business logic: Validate ID and delete note
      if (!id || id.trim() === '') {
        throw new Error('Note ID is required');
      }
      const success = await NotesRepository.delete(id);
      return success;
    } catch (error) {
      console.error('Error in deleteNote:', error);
      throw error;
    }
  }`;
      
      default:
        return `${method}(): Promise<any> {
    // TODO: Implement ${method}
    throw new Error('Method not implemented');
  }`;
    }
  }

  /**
   * Get controller endpoint template
   */
  private getControllerEndpointTemplate(endpoint: { method: string; path: string; handler: string }): string {
    return `router.${endpoint.method}('${endpoint.path}', async (req, res) => {
  try {
    ${this.getControllerHandlerLogic(endpoint.handler, endpoint.method)}
  } catch (error) {
    res.status(500).json({ error: 'Failed to ${endpoint.handler.replace(/([A-Z])/g, ' $1').toLowerCase()}' });
  }
});`;
  }

  /**
   * Get controller handler logic
   */
  private getControllerHandlerLogic(handler: string, method: string): string {
    switch (handler) {
      case 'getAllNotes':
        return `const notes = await NotesService.getAllNotes();
    res.json(notes);`;
      
      case 'getNoteById':
        return `const { id } = req.params;
    const note = await NotesService.getNoteById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);`;
      
      case 'createNote':
        return `const note = await NotesService.createNote(req.body);
    res.status(201).json(note);`;
      
      case 'updateNote':
        return `const { id } = req.params;
    const note = await NotesService.updateNote(id, req.body);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);`;
      
      case 'deleteNote':
        return `const { id } = req.params;
    const success = await NotesService.deleteNote(id);
    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(204).send();`;
      
      default:
        return `// TODO: Implement ${handler} logic
    res.status(501).json({ error: 'Not implemented' });`;
    }
  }

  /**
   * Validate and fix file paths using code plan structure instead of hardcoded logic
   */
  private validateAndFixFilePathUsingCodePlan(filePath: string, currentFilePath: string): string {
    this.log(`🔍 Validating file path using code plan: ${filePath} (current: ${currentFilePath})`);
    
    // CRITICAL: Determine if we're in a backend context
    const isBackendContext = currentFilePath.startsWith('backend/') || 
                            (this.codePlanStructure && this.codePlanStructure.fileStructure.backend.some(f => f.path === currentFilePath));
    
    // Use code plan to determine the correct path - this is the single source of truth
    if (this.codePlanStructure) {
      // Check if this file exists in the code plan
      const allFiles = [
        ...this.codePlanStructure.fileStructure.backend,
        ...this.codePlanStructure.fileStructure.frontend
      ];
      
      // Try to find exact match
      const exactMatch = allFiles.find(f => f.path === filePath);
      if (exactMatch) {
        // CRITICAL: If this is a backend file, ensure it's prefixed with backend/
        if (this.codePlanStructure.fileStructure.backend.some(f => f.path === filePath)) {
          const correctedPath = `backend/${filePath}`;
          this.log(`✅ Found exact match in backend code plan: ${filePath} → ${correctedPath}`);
          return correctedPath;
        }
        this.log(`✅ Found exact match in code plan: ${filePath}`);
        return filePath;
      }
      
      // Try to find match without extension
      const fileNameWithoutExt = filePath.replace(/\.(ts|tsx|js|jsx)$/, '');
      const matchWithoutExt = allFiles.find(f => f.path.replace(/\.(ts|tsx|js|jsx)$/, '') === fileNameWithoutExt);
      if (matchWithoutExt) {
        // CRITICAL: If this is a backend file, ensure it's prefixed with backend/
        if (this.codePlanStructure.fileStructure.backend.some(f => f.path === matchWithoutExt.path)) {
          const correctedPath = `backend/${matchWithoutExt.path}`;
          this.log(`✅ Found match without extension in backend: ${matchWithoutExt.path} → ${correctedPath}`);
          return correctedPath;
        }
        this.log(`✅ Found match without extension: ${matchWithoutExt.path}`);
        return matchWithoutExt.path;
      }
      
      // Try to find by filename only
      const fileName = path.basename(filePath);
      const matchByFileName = allFiles.find(f => path.basename(f.path) === fileName);
      if (matchByFileName) {
        // CRITICAL: If this is a backend file, ensure it's prefixed with backend/
        if (this.codePlanStructure.fileStructure.backend.some(f => f.path === matchByFileName.path)) {
          const correctedPath = `backend/${matchByFileName.path}`;
          this.log(`✅ Found match by filename in backend: ${matchByFileName.path} → ${correctedPath}`);
          return correctedPath;
        }
        this.log(`✅ Found match by filename: ${matchByFileName.path}`);
        return matchByFileName.path;
      }
      
      // CRITICAL: If this is a backend context, ensure the file goes to backend directory
      if (isBackendContext) {
        const backendFiles = this.codePlanStructure.fileStructure.backend;
        if (backendFiles.length > 0) {
          // Check the structure of existing backend files
          const firstBackendFile = backendFiles[0];
          const backendDir = path.dirname(firstBackendFile.path);
          
          if (backendDir === '.') {
            // Backend files are at root level of backend directory
            const correctedPath = `backend/${path.basename(filePath)}`;
            this.log(`🔧 Using backend root structure: ${filePath} → ${correctedPath}`);
            return correctedPath;
          } else {
            // Backend files are in subdirectories
            const correctedPath = `backend/${path.join(backendDir, path.basename(filePath))}`.replace(/\\/g, '/');
            this.log(`🔧 Using backend subdirectory structure: ${filePath} → ${correctedPath}`);
            return correctedPath;
          }
        }
      }
      
      // If no match found, look at the current file's context to determine the correct structure
      const currentFile = allFiles.find(f => f.path === currentFilePath);
      if (currentFile) {
        // Use the same directory structure as the current file
        const currentDir = path.dirname(currentFile.path);
        if (this.codePlanStructure.fileStructure.backend.some(f => f.path === currentFile.path)) {
          // This is a backend file, ensure it's in backend directory
          const correctedPath = `backend/${path.join(currentDir, path.basename(filePath))}`.replace(/\\/g, '/');
          this.log(`🔧 Using same directory structure as current backend file: ${filePath} → ${correctedPath}`);
          return correctedPath;
        }
        const correctedPath = path.join(currentDir, path.basename(filePath)).replace(/\\/g, '/');
        this.log(`🔧 Using same directory structure as current file: ${filePath} → ${correctedPath}`);
        return correctedPath;
      }
      
      // If still no match, check if this is a new file that should follow the same pattern as existing files
      const existingFilesInSameDir = allFiles.filter(f => {
        const currentDir = path.dirname(currentFilePath);
        return path.dirname(f.path) === currentDir;
      });
      
      if (existingFilesInSameDir.length > 0) {
        // Use the same directory structure as other files in the same directory
        const sameDir = path.dirname(existingFilesInSameDir[0].path);
        if (this.codePlanStructure.fileStructure.backend.some(f => f.path === existingFilesInSameDir[0].path)) {
          // This is a backend file, ensure it's in backend directory
          const correctedPath = `backend/${path.join(sameDir, path.basename(filePath))}`.replace(/\\/g, '/');
          this.log(`🔧 Using same directory structure as other backend files: ${filePath} → ${correctedPath}`);
          return correctedPath;
        }
        const correctedPath = path.join(sameDir, path.basename(filePath)).replace(/\\/g, '/');
        this.log(`🔧 Using same directory structure as other files: ${filePath} → ${correctedPath}`);
        return correctedPath;
      }
    }
    
    // CRITICAL: Final fallback - ensure backend files go to backend directory
    if (isBackendContext) {
      const correctedPath = `backend/${path.basename(filePath)}`;
      this.log(`🔧 Final fallback for backend context: ${filePath} → ${correctedPath}`);
      return correctedPath;
    }
    
    // If no code plan available or no matches found, preserve the original path structure
    this.log(`⚠️ No code plan context available or no matches found, preserving original path: ${filePath}`);
    return filePath;
  }

  /**
   * CRITICAL: Enhanced project boundary validation
   */
  private validateProjectBoundary(filePath: string, projectPath: string): boolean {
    const fullPath = path.resolve(path.join(projectPath, filePath));
    const projectPathNormalized = path.resolve(projectPath);
    
    // Check if the file is within the project structure
    if (!fullPath.startsWith(projectPathNormalized)) {
      this.log(`❌ BLOCKED: File path outside project structure: ${filePath}`);
      return false;
    }
    
    // Additional check: ensure backend files stay in backend directory
    if (filePath.includes('backend') && !filePath.startsWith('backend/')) {
      this.log(`❌ BLOCKED: Backend file not in backend directory: ${filePath}`);
      return false;
    }
    
    return true;
  }

  /**
   * Build fix context using code plan instead of file analysis
   */
  private async buildFixContextFromCodePlan(mapping: ErrorFileMapping): Promise<string> {
    const context: string[] = [];
    
    if (!this.codePlanStructure) {
      return context.join('\n');
    }
    
    // Add dependent files context from code plan
    if (mapping.dependents.length > 0) {
      context.push(`Dependent files: ${mapping.dependents.join(', ')}`);
      
      for (const dependent of mapping.dependents.slice(0, 3)) { // Limit to first 3
        const dependentFile = this.codePlanStructure.fileStructure.backend.find(f => f.path === dependent) ||
                             this.codePlanStructure.fileStructure.frontend.find(f => f.path === dependent);
        
        if (dependentFile) {
          context.push(`\nDependent file ${dependent}:\nDescription: ${dependentFile.description}\nDependencies: ${dependentFile.dependencies.join(', ')}`);
        }
      }
    }
    
    // Add dependency files context from code plan
    if (mapping.dependencies.length > 0) {
      context.push(`\nDependencies: ${mapping.dependencies.join(', ')}`);
      
      for (const dependency of mapping.dependencies.slice(0, 3)) { // Limit to first 3
        const dependencyFile = this.codePlanStructure.fileStructure.backend.find(f => f.path === dependency) ||
                              this.codePlanStructure.fileStructure.frontend.find(f => f.path === dependency);
        
        if (dependencyFile) {
          context.push(`\nDependency file ${dependency}:\nDescription: ${dependencyFile.description}\nType: ${dependencyFile.type}`);
        }
      }
    }
    
    return context.join('\n');
  }

  /**
   * Update dependent files when a file is fixed with surgical changes
   */
  private async updateDependentFiles(fixedFilePath: string, changes: any): Promise<string[]> {
    const updatedFiles: string[] = [];
    const mapping = this.errorFileMap.get(fixedFilePath);
    
    if (!mapping) {
      return updatedFiles;
    }
    
    // Get all affected dependents
    const affectedDependents = mapping.affectedDependents;
    
    this.log(`🔄 Checking ${affectedDependents.length} affected dependent files for updates...`);
    
    for (const dependentPath of affectedDependents) {
      try {
        const dependentMapping = this.errorFileMap.get(dependentPath);
        if (!dependentMapping) {
          // Check if dependent has new errors after the fix
          const newErrors = await this.checkForNewErrorsInDependent(dependentPath, fixedFilePath, mapping.surgicalChanges);
          if (newErrors.length > 0) {
            this.log(`🔄 Dependent file ${dependentPath} has new errors after fix, adding to error map`);
            this.errorFileMap.set(dependentPath, {
              filePath: dependentPath,
              errors: newErrors,
              lineErrors: new Map(),
              dependencies: [],
              dependents: [],
              affectedDependents: [],
              priority: 0,
              fixAttempts: 0,
              fixHistory: [],
              surgicalChanges: []
            });
          }
          continue;
        }
        
        this.log(`🔄 Checking dependent file ${dependentPath} for updates...`);
        
        // Check if the dependent file needs updates based on surgical changes
        const needsUpdate = await this.checkIfDependentNeedsSurgicalUpdate(dependentPath, fixedFilePath, mapping.surgicalChanges);
        
        if (needsUpdate) {
          this.log(`🔄 Updating dependent file ${dependentPath} due to surgical changes...`);
          
          // Perform surgical update on dependent file
          const updateResult = await this.performSurgicalUpdateOnDependent(dependentPath, fixedFilePath, mapping.surgicalChanges);
          
          if (updateResult.success) {
            updatedFiles.push(dependentPath);
            this.log(`✅ Updated dependent file ${dependentPath} with surgical changes`);
          } else {
            this.log(`❌ Failed to update dependent file ${dependentPath}: ${updateResult.error}`);
          }
        }
      } catch (error) {
        this.log(`⚠️ Error updating dependent file ${dependentPath}: ${error}`);
      }
    }
    
    return updatedFiles;
  }

  /**
   * Check if a dependent file needs updates based on surgical changes
   */
  private async checkIfDependentNeedsSurgicalUpdate(dependentPath: string, fixedFilePath: string, surgicalChanges: SurgicalChange[]): Promise<boolean> {
    try {
      const dependentFilePath = path.join(this.projectPath, dependentPath);
      const dependentContent = await fs.readFile(dependentFilePath, 'utf-8');
      
      // Check each surgical change to see if it affects the dependent
      for (const change of surgicalChanges) {
        const affectedSymbol = this.extractAffectedSymbolFromChange(change);
        if (affectedSymbol && this.checkIfDependentUsesSymbol(dependentContent, affectedSymbol)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.log(`⚠️ Error checking surgical update for ${dependentPath}: ${error}`);
      return false;
    }
  }

  /**
   * Extract affected symbol from a surgical change
   */
  private extractAffectedSymbolFromChange(change: SurgicalChange): string | null {
    // Analyze the change to determine what symbol was affected
    const originalLine = change.originalLine.trim();
    const fixedLine = change.fixedLine.trim();
    
    // Look for method calls, property access, or variable usage
    const patterns = [
      /(\w+)\(/, // Method calls
      /\.(\w+)/, // Property access
      /\b(\w+)\b/ // Variable usage
    ];
    
    for (const pattern of patterns) {
      const originalMatch = originalLine.match(pattern);
      const fixedMatch = fixedLine.match(pattern);
      
      if (originalMatch && fixedMatch && originalMatch[1] !== fixedMatch[1]) {
        return fixedMatch[1]; // Return the new symbol
      }
    }
    
    return null;
  }

  /**
   * Perform surgical update on a dependent file
   */
  private async performSurgicalUpdateOnDependent(dependentPath: string, fixedFilePath: string, surgicalChanges: SurgicalChange[]): Promise<{
    success: boolean;
    error?: string;
    changesApplied: string[];
  }> {
    try {
      const dependentFilePath = path.join(this.projectPath, dependentPath);
      const dependentContent = await fs.readFile(dependentFilePath, 'utf-8');
      const lines = dependentContent.split('\n');
      const changesApplied: string[] = [];
      let hasChanges = false;
      
      // Apply surgical changes to dependent file
      for (const change of surgicalChanges) {
        const affectedSymbol = this.extractAffectedSymbolFromChange(change);
        if (!affectedSymbol) continue;
        
        // Find lines in dependent that use the affected symbol
        const affectedLines = this.findLinesUsingSymbol(lines, affectedSymbol);
        
        for (const lineInfo of affectedLines) {
          const { lineIndex, line, usage } = lineInfo;
          
          // Build context for AI fix
          const context: LineErrorContext = {
            lineNumber: lineIndex + 1,
            lineContent: line,
            errors: [{
              message: `Symbol '${affectedSymbol}' was changed in ${fixedFilePath}`,
              file: dependentPath,
              line: lineIndex + 1,
              type: 'typescript',
              severity: 'error'
            } as BuildError],
            surroundingContext: this.getSurroundingContext(lines, lineIndex),
            dependentFiles: [],
            methodContext: this.findMethodContext(lines, lineIndex)
          };
          
          // Perform AI surgical fix
          const fixedLine = await this.performAISurgicalFix(context, line);
          
          if (fixedLine !== line) {
            lines[lineIndex] = fixedLine;
            changesApplied.push(`Line ${lineIndex + 1}: Updated usage of ${affectedSymbol}`);
            hasChanges = true;
            
            this.log(`🔧 Surgical update in dependent ${dependentPath}:${lineIndex + 1}: ${line.trim()} → ${fixedLine.trim()}`);
          }
        }
      }
      
      if (hasChanges) {
        await fs.writeFile(dependentFilePath, lines.join('\n'), 'utf-8');
      }
      
      return {
        success: true,
        changesApplied
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        changesApplied: []
      };
    }
  }

  /**
   * Find lines in a file that use a specific symbol
   */
  private findLinesUsingSymbol(lines: string[], symbol: string): Array<{ lineIndex: number; line: string; usage: string }> {
    const affectedLines: Array<{ lineIndex: number; line: string; usage: string }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for different types of symbol usage
      const usagePatterns = [
        { pattern: new RegExp(`\\b${symbol}\\b`, 'g'), type: 'direct' },
        { pattern: new RegExp(`\\.${symbol}\\b`, 'g'), type: 'property' },
        { pattern: new RegExp(`${symbol}\\(`, 'g'), type: 'method' }
      ];
      
      for (const { pattern, type } of usagePatterns) {
        if (pattern.test(line)) {
          affectedLines.push({
            lineIndex: i,
            line: line,
            usage: type
          });
          break; // Only add each line once
        }
      }
    }
    
    return affectedLines;
  }

  /**
   * Get surrounding context for a line
   */
  private getSurroundingContext(lines: string[], lineIndex: number): string[] {
    const context: string[] = [];
    
    for (let i = Math.max(0, lineIndex - 3); i <= Math.min(lines.length - 1, lineIndex + 3); i++) {
      if (i !== lineIndex) {
        context.push(`${i + 1}: ${lines[i]}`);
      }
    }
    
    return context;
  }

  /**
   * Check for new errors in a dependent file after a fix
   */
  private async checkForNewErrorsInDependent(dependentPath: string, fixedFilePath: string, surgicalChanges: SurgicalChange[]): Promise<BuildError[]> {
    try {
      // This would typically involve running a build or type check
      // For now, we'll return an empty array and let the build process catch new errors
      return [];
    } catch (error) {
      this.log(`⚠️ Error checking for new errors in ${dependentPath}: ${error}`);
      return [];
    }
  }

  /**
   * Helper methods
   */
  private normalizeFilePath(filePath: string): string {
    // Remove project path prefix if present
    const relativePath = filePath.replace(this.projectPath, '').replace(/^[\/\\]/, '');
    return relativePath;
  }

  private isCoreFile(filePath: string): boolean {
    // Use code plan to determine if this is a core file
    if (this.codePlanStructure) {
      const allFiles = [
        ...this.codePlanStructure.fileStructure.backend,
        ...this.codePlanStructure.fileStructure.frontend
      ];
      
      const file = allFiles.find(f => f.path === filePath);
      if (file) {
        // Check if it's a core file based on type or description
        const coreTypes = ['model', 'service', 'controller', 'repository', 'database', 'config'];
        return coreTypes.some(type => file.type?.includes(type) || file.description?.toLowerCase().includes(type));
      }
    }
    
    // Fallback: check filename patterns
    const fileName = path.basename(filePath).toLowerCase();
    const corePatterns = ['model', 'service', 'controller', 'repository', 'database', 'config', 'utils'];
    return corePatterns.some(pattern => fileName.includes(pattern));
  }

  private checkIfDependentNeedsUpdate(dependentPath: string, fixedFilePath: string, changes: any): boolean {
    // Simple heuristic: if the fixed file exports something and the dependent imports it
    const dependentGraph = this.dependencyGraph[dependentPath];
    const fixedGraph = this.dependencyGraph[fixedFilePath];
    
    if (!dependentGraph || !fixedGraph) return false;
    
    // Check if dependent imports from the fixed file
    return dependentGraph.dependencies.includes(fixedFilePath);
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [EnhancedErrorFixer] ${message}`;
    console.log(logMessage);
    this.fixLogs.push(logMessage);
  }

  /**
   * Get detailed error fixing report
   */
  getErrorFixingReport(): {
    totalFiles: number;
    fixedFiles: number;
    failedFiles: number;
    errorFileMap: Map<string, ErrorFileMapping>;
    logs: string[];
  } {
    const totalFiles = this.errorFileMap.size;
    const fixedFiles = Array.from(this.errorFileMap.values())
      .filter(mapping => mapping.fixHistory.some(attempt => attempt.success)).length;
    const failedFiles = totalFiles - fixedFiles;
    
    return {
      totalFiles,
      fixedFiles,
      failedFiles,
      errorFileMap: this.errorFileMap,
      logs: this.fixLogs
    };
  }
} 