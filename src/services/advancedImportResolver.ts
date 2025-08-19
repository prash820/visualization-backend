import { Project, SourceFile, ImportDeclaration, SyntaxKind, Node, ts, ScriptTarget, ModuleKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs-extra';
import { GlobalSymbolTable, GlobalSymbol, MethodSignature, TypeDefinition } from './codeGenerationEngine';

export interface ImportInfo {
  module: string;
  imports: Array<{
    name: string;
    alias?: string;
    isDefault?: boolean;
  }>;
  location: {
    line: number;
    column: number;
  };
}

export interface ImportResolutionResult {
  success: boolean;
  imports: ImportInfo[];
  missingImports: string[];
  unusedImports: string[];
  suggestions: string[];
}

export interface MonorepoConfig {
  packages: string[];
  sharedTypes: string[];
  aliases: Map<string, string>;
  basePath: string;
}

export class AdvancedImportResolver {
  private project: Project;
  private symbolTable: GlobalSymbolTable;
  private monorepoConfig: MonorepoConfig;
  private projectPath: string;

  constructor(projectPath: string, symbolTable: GlobalSymbolTable, monorepoConfig?: MonorepoConfig) {
    this.projectPath = projectPath;
    this.symbolTable = symbolTable;
    this.monorepoConfig = monorepoConfig || this.createDefaultMonorepoConfig();
    
    // Initialize ts-morph project with fallback options
    try {
      const tsConfigPath = path.join(projectPath, 'tsconfig.json');
      if (fs.existsSync(tsConfigPath)) {
        this.project = new Project({
          tsConfigFilePath: tsConfigPath,
          skipAddingFilesFromTsConfig: true
        });
      } else {
        // Fallback to basic project configuration
        this.project = new Project({
          compilerOptions: {
            target: ScriptTarget.ES2020,
            module: ModuleKind.CommonJS,
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true
          },
          skipAddingFilesFromTsConfig: true
        });
      }
    } catch (error) {
      console.warn('[AdvancedImportResolver] Failed to initialize project with tsconfig, using fallback:', error);
      // Fallback to basic project configuration
      this.project = new Project({
        compilerOptions: {
          target: ScriptTarget.ES2020,
          module: ModuleKind.CommonJS,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        },
        skipAddingFilesFromTsConfig: true
      });
    }
  }

  private createDefaultMonorepoConfig(): MonorepoConfig {
    return {
      packages: ['backend', 'frontend', 'shared'],
      sharedTypes: ['types', 'interfaces', 'utils'],
      aliases: new Map([
        ['@/', 'src/'],
        ['@backend/', 'src/backend/'],
        ['@frontend/', 'src/frontend/'],
        ['@shared/', 'src/shared/'],
        ['@types/', 'src/types/'],
        ['@utils/', 'src/utils/']
      ]),
      basePath: this.projectPath
    };
  }

  /**
   * AST-based import injection using ts-morph
   */
  async injectImportsFromSymbolTable(filePath: string): Promise<ImportResolutionResult> {
    const result: ImportResolutionResult = {
      success: false,
      imports: [],
      missingImports: [],
      unusedImports: [],
      suggestions: []
    };

    try {
      // Add source file to project
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      
      // Analyze existing imports
      const existingImports = this.extractExistingImports(sourceFile);
      
      // Find missing imports based on symbol usage
      const missingImports = this.findMissingImports(sourceFile);
      
      // Generate import suggestions from symbol table
      const importSuggestions = this.generateImportSuggestions(missingImports);
      
      // Inject missing imports
      await this.injectMissingImports(sourceFile, importSuggestions);
      
      // Remove unused imports
      const unusedImports = this.findUnusedImports(sourceFile);
      await this.removeUnusedImports(sourceFile, unusedImports);
      
      // Organize imports
      await this.organizeImports(sourceFile);
      
      // Save the file
      sourceFile.saveSync();
      
      result.success = true;
      result.imports = this.extractExistingImports(sourceFile);
      result.missingImports = missingImports;
      result.unusedImports = unusedImports;
      result.suggestions = importSuggestions.map(s => s.module);
      
    } catch (error) {
      console.error('[AdvancedImportResolver] Import injection failed:', error);
      result.success = false;
    }

    return result;
  }

  /**
   * Extract existing imports from a source file
   */
  private extractExistingImports(sourceFile: SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const module = importDecl.getModuleSpecifierValue();
      const importClause = importDecl.getImportClause();
      const importInfo: ImportInfo = {
        module,
        imports: [],
        location: {
          line: importDecl.getStartLineNumber(),
          column: importDecl.getStart()
        }
      };

      if (importClause) {
        // Default import
        const defaultImport = importClause.getDefaultImport();
        if (defaultImport) {
          importInfo.imports.push({
            name: defaultImport.getText(),
            isDefault: true
          });
        }

        // Named imports
        const namedImports = importClause.getNamedImports();
        namedImports.forEach(namedImport => {
          importInfo.imports.push({
            name: namedImport.getName(),
            alias: namedImport.getAliasNode()?.getText()
          });
        });
      }

      imports.push(importInfo);
    });

    return imports;
  }

  /**
   * Find missing imports by analyzing symbol usage
   */
  private findMissingImports(sourceFile: SourceFile): string[] {
    const missingImports: string[] = [];
    const usedSymbols = new Set<string>();
    
    // Collect all identifiers used in the file
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.Identifier) {
        const identifier = node as unknown as ts.Identifier;
        const symbolName = identifier.getText();
        
        // Skip if it's a local variable or parameter
        if (!this.isLocalSymbol(identifier)) {
          usedSymbols.add(symbolName);
        }
      }
    });

    // Check if used symbols are imported
    const existingImports = this.extractExistingImports(sourceFile);
    const importedSymbols = new Set<string>();
    
    existingImports.forEach(importInfo => {
      importInfo.imports.forEach(imp => {
        importedSymbols.add(imp.alias || imp.name);
      });
    });

    // Find missing imports
    usedSymbols.forEach(symbol => {
      if (!importedSymbols.has(symbol) && this.symbolTable.symbols.has(symbol)) {
        missingImports.push(symbol);
      }
    });

    return missingImports;
  }

  /**
   * Check if an identifier is a local symbol (variable, parameter, etc.)
   */
  private isLocalSymbol(identifier: ts.Identifier): boolean {
    const parent = identifier.parent;
    
    // Check if it's a variable declaration
    if (parent && parent.kind === SyntaxKind.VariableDeclaration) {
      return true;
    }
    
    // Check if it's a parameter
    if (parent && parent.kind === SyntaxKind.Parameter) {
      return true;
    }
    
    // Check if it's a function declaration
    if (parent && parent.kind === SyntaxKind.FunctionDeclaration) {
      return true;
    }
    
    // Check if it's a class declaration
    if (parent && parent.kind === SyntaxKind.ClassDeclaration) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate import suggestions from symbol table
   */
  private generateImportSuggestions(missingSymbols: string[]): Array<{ module: string; imports: string[] }> {
    const suggestions: Array<{ module: string; imports: string[] }> = [];
    const moduleGroups = new Map<string, string[]>();
    
    missingSymbols.forEach(symbolName => {
      const symbol = this.symbolTable.symbols.get(symbolName);
      if (symbol) {
        const modulePath = this.resolveModulePath(symbol.filePath);
        if (!moduleGroups.has(modulePath)) {
          moduleGroups.set(modulePath, []);
        }
        moduleGroups.get(modulePath)!.push(symbolName);
      }
    });
    
    moduleGroups.forEach((imports, module) => {
      suggestions.push({ module, imports });
    });
    
    return suggestions;
  }

  /**
   * Resolve module path for import
   */
  private resolveModulePath(filePath: string): string {
    // Handle monorepo structure
    if (this.monorepoConfig) {
      // Check if it's a shared type
      if (this.monorepoConfig.sharedTypes.some(type => filePath.includes(type))) {
        return `@shared/${path.relative(this.projectPath, filePath)}`;
      }
      
      // Check if it's in a specific package
      for (const pkg of this.monorepoConfig.packages) {
        if (filePath.includes(pkg)) {
          return `@${pkg}/${path.relative(this.projectPath, filePath)}`;
        }
      }
    }
    
    // Default relative path resolution
    return path.relative(this.projectPath, filePath).replace(/\.ts$/, '');
  }

  /**
   * Inject missing imports into the source file
   */
  private async injectMissingImports(sourceFile: SourceFile, importSuggestions: Array<{ module: string; imports: string[] }>): Promise<void> {
    importSuggestions.forEach(suggestion => {
      const importDeclaration = sourceFile.addImportDeclaration({
        moduleSpecifier: suggestion.module,
        namedImports: suggestion.imports
      });
      
      // Move import to the top
      importDeclaration.setOrder(0);
    });
  }

  /**
   * Find unused imports
   */
  private findUnusedImports(sourceFile: SourceFile): string[] {
    const unusedImports: string[] = [];
    const existingImports = this.extractExistingImports(sourceFile);
    const usedSymbols = new Set<string>();
    
    // Collect all used symbols
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.Identifier) {
        const identifier = node as unknown as ts.Identifier;
        usedSymbols.add(identifier.getText());
      }
    });
    
    // Check which imports are unused
    existingImports.forEach(importInfo => {
      importInfo.imports.forEach(imp => {
        const symbolName = imp.alias || imp.name;
        if (!usedSymbols.has(symbolName)) {
          unusedImports.push(symbolName);
        }
      });
    });
    
    return unusedImports;
  }

  /**
   * Remove unused imports
   */
  private async removeUnusedImports(sourceFile: SourceFile, unusedImports: string[]): Promise<void> {
    const importDeclarations = sourceFile.getImportDeclarations();
    
    importDeclarations.forEach(importDecl => {
      const importClause = importDecl.getImportClause();
      if (importClause) {
        const namedImports = importClause.getNamedImports();
        const usedNamedImports: string[] = [];
        
        namedImports.forEach(namedImport => {
          const importName = namedImport.getName();
          if (!unusedImports.includes(importName)) {
            usedNamedImports.push(importName);
          }
        });
        
        // If no named imports remain, remove the entire import declaration
        if (usedNamedImports.length === 0) {
          importDecl.remove();
        } else {
          // Update the import declaration with only used imports
          // Note: ts-morph doesn't have setNamedImports, so we'll remove and recreate
          importDecl.remove();
          sourceFile.addImportDeclaration({
            moduleSpecifier: importDecl.getModuleSpecifierValue(),
            namedImports: usedNamedImports
          });
        }
      }
    });
  }

  /**
   * Organize imports (sort, group, etc.)
   */
  private async organizeImports(sourceFile: SourceFile): Promise<void> {
    const importDeclarations = sourceFile.getImportDeclarations();
    
    // Sort imports by module name
    const sortedImports = importDeclarations.sort((a, b) => {
      const moduleA = a.getModuleSpecifierValue();
      const moduleB = b.getModuleSpecifierValue();
      return moduleA.localeCompare(moduleB);
    });
    
    // Reorder imports in the file
    sortedImports.forEach((importDecl, index) => {
      importDecl.setOrder(index);
    });
  }

  /**
   * Automatic import generation from symbol table
   */
  async generateImportsFromSymbolTable(filePath: string, targetSymbols: string[]): Promise<ImportResolutionResult> {
    const result: ImportResolutionResult = {
      success: false,
      imports: [],
      missingImports: [],
      unusedImports: [],
      suggestions: []
    };

    try {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      
      // Generate imports for target symbols
      const importSuggestions = this.generateImportSuggestions(targetSymbols);
      
      // Inject the imports
      await this.injectMissingImports(sourceFile, importSuggestions);
      
      // Organize imports
      await this.organizeImports(sourceFile);
      
      // Save the file
      sourceFile.saveSync();
      
      result.success = true;
      result.imports = this.extractExistingImports(sourceFile);
      result.suggestions = importSuggestions.map(s => s.module);
      
    } catch (error) {
      console.error('[AdvancedImportResolver] Import generation failed:', error);
      result.success = false;
    }

    return result;
  }

  /**
   * Import path resolution for monorepo structure
   */
  resolveImportPath(importPath: string, currentFilePath: string): string | null {
    // Handle aliases
    for (const [alias, aliasPath] of this.monorepoConfig.aliases) {
      if (importPath.startsWith(alias)) {
        const relativePath = importPath.replace(alias, aliasPath);
        return path.resolve(this.projectPath, relativePath);
      }
    }
    
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return path.resolve(path.dirname(currentFilePath), importPath);
    }
    
    // Handle absolute imports
    if (importPath.startsWith('/')) {
      return path.resolve(this.projectPath, importPath.substring(1));
    }
    
    // Handle package imports (node_modules)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      const packagePath = path.join(this.projectPath, 'node_modules', importPath);
      if (fs.existsSync(packagePath)) {
        return packagePath;
      }
    }
    
    return null;
  }

  /**
   * Batch process multiple files for import resolution
   */
  async batchProcessImports(filePaths: string[]): Promise<Map<string, ImportResolutionResult>> {
    const results = new Map<string, ImportResolutionResult>();
    
    for (const filePath of filePaths) {
      try {
        const result = await this.injectImportsFromSymbolTable(filePath);
        results.set(filePath, result);
      } catch (error) {
        console.error(`[AdvancedImportResolver] Failed to process ${filePath}:`, error);
        results.set(filePath, {
          success: false,
          imports: [],
          missingImports: [],
          unusedImports: [],
          suggestions: []
        });
      }
    }
    
    return results;
  }

  /**
   * Validate import paths across the project
   */
  async validateImportPaths(): Promise<{
    valid: string[];
    invalid: string[];
    suggestions: Map<string, string[]>;
  }> {
    const valid: string[] = [];
    const invalid: string[] = [];
    const suggestions = new Map<string, string[]>();
    
    const sourceFiles = this.project.getSourceFiles();
    
    sourceFiles.forEach(sourceFile => {
      const filePath = sourceFile.getFilePath();
      const importDeclarations = sourceFile.getImportDeclarations();
      
      importDeclarations.forEach(importDecl => {
        const importPath = importDecl.getModuleSpecifierValue();
        const resolvedPath = this.resolveImportPath(importPath, filePath);
        
        if (resolvedPath && fs.existsSync(resolvedPath)) {
          valid.push(importPath);
        } else {
          invalid.push(importPath);
          
          // Generate suggestions for invalid imports
          const symbolSuggestions = this.findSimilarSymbols(importPath);
          suggestions.set(importPath, symbolSuggestions);
        }
      });
    });
    
    return { valid, invalid, suggestions };
  }

  /**
   * Find similar symbols for import suggestions
   */
  private findSimilarSymbols(importPath: string): string[] {
    const suggestions: string[] = [];
    const searchTerm = importPath.split('/').pop() || importPath;
    
    // Search in symbol table
    this.symbolTable.symbols.forEach((symbol, symbolName) => {
      if (symbolName.toLowerCase().includes(searchTerm.toLowerCase())) {
        suggestions.push(this.resolveModulePath(symbol.filePath));
      }
    });
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Clean up and dispose resources
   */
  dispose(): void {
    // Clear references to prevent memory leaks
    if (this.project) {
      // ts-morph Project doesn't have dispose method, just clear references
      this.project = null as any;
    }
  }
} 