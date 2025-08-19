import { Project, SourceFile, ImportDeclaration, SyntaxKind, Node } from 'ts-morph';
import { SymbolTable, SymbolRecord } from './symbolTable';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

export interface ImportFix {
  filePath: string;
  addedImports: string[];
  removedImports: string[];
  fixedSymbols: string[];
}

export interface SmartImportAnalysis {
  missingImports: string[];
  unusedImports: string[];
  duplicateImports: string[];
  crossFileDependencies: Record<string, string[]>;
  suggestions: Array<{
    symbol: string;
    sourceFile: string;
    importPath: string;
  }>;
}

export class SmartImportResolver {
  private project: Project;
  private symbolTable: SymbolTable;
  private generatedFiles: Set<string>;
  private fileSymbols: Map<string, Set<string>>;

  constructor(projectPath: string, symbolTable: SymbolTable) {
    this.project = new Project({
      useInMemoryFileSystem: false
    });
    this.symbolTable = symbolTable;
    this.generatedFiles = new Set();
    this.fileSymbols = new Map();
  }

  /**
   * Register all generated files and their symbols
   */
  async registerGeneratedFiles(filePaths: string[]): Promise<void> {
    console.log(`[SmartImportResolver] Registering ${filePaths.length} generated files`);
    
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          this.generatedFiles.add(filePath);
          await this.analyzeFileSymbols(filePath);
          console.log(`[SmartImportResolver] ✅ Registered: ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.warn(`[SmartImportResolver] Could not register ${filePath}:`, error);
      }
    }
  }

  /**
   * Analyze symbols in a file and register them
   */
  private async analyzeFileSymbols(filePath: string): Promise<void> {
    try {
      const content = await promisify(fs.readFile)(filePath, 'utf-8');
      const sourceFile = this.project.createSourceFile(filePath, content);
      
      const symbols = new Set<string>();
      
      // Extract class names
      sourceFile.getClasses().forEach(classDecl => {
        const className = classDecl.getName();
        if (className) {
          symbols.add(className);
          this.registerSymbol(filePath, 'class', className, sourceFile);
        }
      });
      
      // Extract interface names
      sourceFile.getInterfaces().forEach(interfaceDecl => {
        const interfaceName = interfaceDecl.getName();
        if (interfaceName) {
          symbols.add(interfaceName);
          this.registerSymbol(filePath, 'interface', interfaceName, sourceFile);
        }
      });
      
      // Extract function names
      sourceFile.getFunctions().forEach(funcDecl => {
        const funcName = funcDecl.getName();
        if (funcName) {
          symbols.add(funcName);
          this.registerSymbol(filePath, 'function', funcName, sourceFile);
        }
      });
      
      // Extract exported variables
      sourceFile.getVariableStatements().forEach(varStmt => {
        varStmt.getDeclarations().forEach(decl => {
          const varName = decl.getName();
          if (varName) {
            symbols.add(varName);
            this.registerSymbol(filePath, 'variable', varName, sourceFile);
          }
        });
      });
      
      this.fileSymbols.set(filePath, symbols);
      
    } catch (error) {
      console.warn(`[SmartImportResolver] Could not analyze symbols for ${filePath}:`, error);
    }
  }

  /**
   * Register a symbol in the symbol table
   */
  private registerSymbol(filePath: string, kind: string, name: string, sourceFile: SourceFile): void {
    const relativePath = this.calculateRelativePath(filePath);
    const exports = [name];
    
    // Extract methods if it's a class
    const methods: Record<string, { params: { name: string; tsType: string }[]; returns: string }> = {};
    
    if (kind === 'class') {
      const classDecl = sourceFile.getClass(name);
      if (classDecl) {
        classDecl.getMethods().forEach(method => {
          const methodName = method.getName();
          const params = method.getParameters().map(param => ({
            name: param.getName(),
            tsType: param.getType().getText()
          }));
          const returns = method.getReturnType().getText();
          methods[methodName] = { params, returns };
        });
      }
    }
    
    const symbolRecord: SymbolRecord = {
      kind: kind as any,
      name,
      filePath,
      exports,
      methods: Object.keys(methods).length > 0 ? methods : undefined,
      description: `Generated ${kind} for ${name}`
    };
    
    this.symbolTable.addSymbol(symbolRecord);
  }

  /**
   * Smart import fixing with cross-file awareness
   */
  async fixImportsIntelligently(filePath: string): Promise<ImportFix> {
    const fix: ImportFix = {
      filePath,
      addedImports: [],
      removedImports: [],
      fixedSymbols: []
    };

    try {
      // Check if file exists before trying to get source file
      if (!fs.existsSync(filePath)) {
        console.warn(`[SmartImportResolver] File does not exist: ${filePath}`);
        return fix;
      }

      // Try to get source file, create it if it doesn't exist in project
      let sourceFile: SourceFile;
      try {
        sourceFile = this.project.getSourceFileOrThrow(filePath);
      } catch (error) {
        // File doesn't exist in project, add it
        const content = await promisify(fs.readFile)(filePath, 'utf-8');
        sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });
      }

      const usedSymbols = this.collectUsedSymbols(sourceFile);
      const existingImports = this.getExistingImports(sourceFile);
      
      // Find missing imports
      const missingImports = this.findMissingImports(usedSymbols, existingImports, filePath);
      
      // Add missing imports
      for (const missingImport of missingImports) {
        await this.addImport(sourceFile, missingImport);
        fix.addedImports.push(`${missingImport.symbol} from ${missingImport.importPath}`);
        fix.fixedSymbols.push(missingImport.symbol);
      }
      
      // Remove unused imports
      const unusedImports = this.findUnusedImports(sourceFile, usedSymbols);
      for (const unusedImport of unusedImports) {
        await this.removeImport(sourceFile, unusedImport);
        fix.removedImports.push(unusedImport);
      }
      
      await sourceFile.save();
      
    } catch (error) {
      console.error(`[SmartImportResolver] Error fixing imports for ${filePath}:`, error);
    }

    return fix;
  }

  /**
   * Collect all used symbols from a source file
   */
  private collectUsedSymbols(sourceFile: SourceFile): Set<string> {
    const usedSymbols = new Set<string>();
    
    sourceFile.forEachDescendant(node => {
      if (Node.isIdentifier(node)) {
        const name = node.getText();
        const parent = node.getParent();
        
        // Skip if it's part of an import/export declaration
        if (parent && (Node.isImportDeclaration(parent) || Node.isExportDeclaration(parent))) {
          return;
        }
        
        // Skip if it's a property access (e.g., obj.prop)
        if (parent && Node.isPropertyAccessExpression(parent)) {
          if (parent.getExpression() === node) {
            return; // Skip the object part of property access
          }
        }
        
        // Skip built-in types and globals
        const builtIns = ['string', 'number', 'boolean', 'any', 'void', 'null', 'undefined', 'Promise', 'Array', 'Object'];
        const globals = ['console', 'process', 'Buffer', 'setTimeout', 'setInterval'];
        
        if (!builtIns.includes(name) && !globals.includes(name)) {
          usedSymbols.add(name);
        }
      }
    });
    
    return usedSymbols;
  }

  /**
   * Find missing imports by checking all generated files
   */
  private findMissingImports(
    usedSymbols: Set<string>, 
    existingImports: Map<string, ImportDeclaration>,
    currentFilePath: string
  ): Array<{ symbol: string; importPath: string; sourceFile: string }> {
    const missingImports: Array<{ symbol: string; importPath: string; sourceFile: string }> = [];
    
    for (const symbol of usedSymbols) {
      // Check if symbol is already imported
      let isImported = false;
      for (const [importPath, importDecl] of existingImports) {
        const namedImports = importDecl.getNamedImports().map(named => named.getName());
        const defaultImport = importDecl.getDefaultImport()?.getText();
        
        if (namedImports.includes(symbol) || defaultImport === symbol) {
          isImported = true;
          break;
        }
      }
      
      if (!isImported) {
        // Find the file that exports this symbol
        const sourceFile = this.findSymbolSourceFile(symbol);
        if (sourceFile && sourceFile !== currentFilePath) {
          const importPath = this.calculateRelativePath(currentFilePath, sourceFile);
          missingImports.push({
            symbol,
            importPath,
            sourceFile
          });
        }
      }
    }
    
    return missingImports;
  }

  /**
   * Find which file exports a given symbol
   */
  private findSymbolSourceFile(symbol: string): string | null {
    // First check symbol table
    const symbolRecord = this.symbolTable.get(symbol);
    if (symbolRecord) {
      return symbolRecord.filePath;
    }
    
    // Then check file symbols map
    for (const [filePath, symbols] of this.fileSymbols) {
      if (symbols.has(symbol)) {
        return filePath;
      }
    }
    
    return null;
  }

  /**
   * Add an import to a source file
   */
  private async addImport(
    sourceFile: SourceFile, 
    importInfo: { symbol: string; importPath: string }
  ): Promise<void> {
    try {
      // Check if import already exists
      const existingImport = sourceFile.getImportDeclarations().find(imp => 
        imp.getModuleSpecifierValue() === importInfo.importPath
      );
      
      if (existingImport) {
        // Add to existing import
        const existingNamedImports = existingImport.getNamedImports().map(named => named.getName());
        if (!existingNamedImports.includes(importInfo.symbol)) {
          existingImport.addNamedImport(importInfo.symbol);
        }
      } else {
        // Create new import
        sourceFile.addImportDeclaration({
          moduleSpecifier: importInfo.importPath,
          namedImports: [importInfo.symbol]
        });
      }
    } catch (error) {
      console.warn(`[SmartImportResolver] Could not add import for ${importInfo.symbol}:`, error);
    }
  }

  /**
   * Remove an unused import
   */
  private async removeImport(sourceFile: SourceFile, importPath: string): Promise<void> {
    try {
      const importDecl = sourceFile.getImportDeclarations().find(imp => 
        imp.getModuleSpecifierValue() === importPath
      );
      
      if (importDecl) {
        importDecl.remove();
      }
    } catch (error) {
      console.warn(`[SmartImportResolver] Could not remove import ${importPath}:`, error);
    }
  }

  /**
   * Find unused imports
   */
  private findUnusedImports(sourceFile: SourceFile, usedSymbols: Set<string>): string[] {
    const unusedImports: string[] = [];
    
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const namedImports = importDecl.getNamedImports().map(named => named.getName());
      const defaultImport = importDecl.getDefaultImport()?.getText();
      
      const allImports = [...namedImports];
      if (defaultImport) allImports.push(defaultImport);
      
      const unusedInThisImport = allImports.filter(importName => !usedSymbols.has(importName));
      
      if (unusedInThisImport.length === allImports.length) {
        unusedImports.push(moduleSpecifier);
      }
    });
    
    return unusedImports;
  }

  /**
   * Get existing imports from a source file
   */
  private getExistingImports(sourceFile: SourceFile): Map<string, ImportDeclaration> {
    const imports = new Map<string, ImportDeclaration>();
    
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier) {
        imports.set(moduleSpecifier, importDecl);
      }
    });
    
    return imports;
  }

  /**
   * Calculate relative path between two files
   */
  private calculateRelativePath(fromPath: string, toPath?: string): string {
    if (!toPath) {
      return './' + path.basename(fromPath, '.ts');
    }
    
    const fromDir = path.dirname(fromPath);
    const relativePath = path.relative(fromDir, toPath).replace(/\\/g, '/');
    
    // Ensure path starts with ./
    if (!relativePath.startsWith('.')) {
      return `./${relativePath}`;
    }
    
    return relativePath;
  }

  /**
   * Fix all imports across all generated files
   */
  async fixAllImports(filePaths: string[]): Promise<{
    fixes: ImportFix[];
    summary: {
      totalFiles: number;
      filesFixed: number;
      importsAdded: number;
      importsRemoved: number;
      symbolsFixed: number;
    };
  }> {
    console.log(`[SmartImportResolver] 🔧 Fixing imports for ${filePaths.length} files`);
    
    const fixes: ImportFix[] = [];
    let importsAdded = 0;
    let importsRemoved = 0;
    let symbolsFixed = 0;
    
    for (const filePath of filePaths) {
      try {
        const fix = await this.fixImportsIntelligently(filePath);
        fixes.push(fix);
        
        importsAdded += fix.addedImports.length;
        importsRemoved += fix.removedImports.length;
        symbolsFixed += fix.fixedSymbols.length;
        
        if (fix.addedImports.length > 0 || fix.removedImports.length > 0) {
          console.log(`[SmartImportResolver] ✅ Fixed ${filePath}: +${fix.addedImports.length} -${fix.removedImports.length} imports`);
        }
      } catch (error) {
        console.error(`[SmartImportResolver] ❌ Failed to fix imports for ${filePath}:`, error);
      }
    }
    
    const summary = {
      totalFiles: filePaths.length,
      filesFixed: fixes.length,
      importsAdded,
      importsRemoved,
      symbolsFixed
    };
    
    console.log(`[SmartImportResolver] 📊 Import fixing complete:`, summary);
    
    return { fixes, summary };
  }

  /**
   * Analyze cross-file dependencies
   */
  analyzeCrossFileDependencies(filePaths: string[]): SmartImportAnalysis {
    const analysis: SmartImportAnalysis = {
      missingImports: [],
      unusedImports: [],
      duplicateImports: [],
      crossFileDependencies: {},
      suggestions: []
    };
    
    for (const filePath of filePaths) {
      try {
        const sourceFile = this.project.addSourceFileAtPath(filePath);
        if (!sourceFile) continue;
        
        const usedSymbols = this.collectUsedSymbols(sourceFile);
        const existingImports = this.getExistingImports(sourceFile);
        
        // Find missing imports
        const missingImports = this.findMissingImports(usedSymbols, existingImports, filePath);
        analysis.missingImports.push(...missingImports.map(m => m.symbol));
        
        // Find unused imports
        const unusedImports = this.findUnusedImports(sourceFile, usedSymbols);
        analysis.unusedImports.push(...unusedImports);
        
        // Build cross-file dependencies
        const dependencies: string[] = [];
        for (const missingImport of missingImports) {
          dependencies.push(missingImport.sourceFile);
          analysis.suggestions.push({
            symbol: missingImport.symbol,
            sourceFile: missingImport.sourceFile,
            importPath: missingImport.importPath
          });
        }
        
        analysis.crossFileDependencies[filePath] = dependencies;
        
      } catch (error) {
        console.warn(`[SmartImportResolver] Could not analyze ${filePath}:`, error);
      }
    }
    
    return analysis;
  }
}

export default SmartImportResolver; 