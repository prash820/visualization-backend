import * as path from "path";
import { Project, SourceFile, ImportDeclaration, SyntaxKind, Node } from "ts-morph";
import { SymbolTable, SymbolRecord } from "./symbolTable";

export interface ImportResolution {
  symbolName: string;
  filePath: string;
  relativePath: string;
  namedImports: string[];
  defaultImport?: string;
}

export interface ImportAnalysis {
  missingImports: string[];
  unusedImports: string[];
  duplicateImports: string[];
  suggestions: ImportResolution[];
}

export class ImportResolver {
  private project: Project;
  private symbolTable: SymbolTable;

  constructor(project: Project, symbolTable: SymbolTable) {
    this.project = project;
    this.symbolTable = symbolTable;
  }

  /**
   * Ensure all required imports are present in a file
   */
  async ensureImports(filePath: string, requiredSymbols: string[]): Promise<void> {
    try {
      const sourceFile = this.project.getSourceFileOrThrow(filePath);
      const existingImports = this.getExistingImports(sourceFile);
      const missingImports = this.findMissingImports(filePath, requiredSymbols, existingImports);
      
      if (missingImports.length > 0) {
        await this.addMissingImports(sourceFile, missingImports);
      }
      
      await sourceFile.save();
    } catch (error) {
      console.error(`[ImportResolver] Error ensuring imports for ${filePath}:`, error);
    }
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
   * Find missing imports by comparing required symbols with existing imports
   */
  private findMissingImports(filePath: string, requiredSymbols: string[], existingImports: Map<string, ImportDeclaration>): ImportResolution[] {
    const missingImports: ImportResolution[] = [];
    
    requiredSymbols.forEach(symbolName => {
      const symbolRecord = this.symbolTable.get(symbolName);
      if (!symbolRecord) {
        console.warn(`[ImportResolver] Symbol not found in symbol table: ${symbolName}`);
        return;
      }
      
      const relativePath = this.calculateRelativePath(filePath, symbolRecord.filePath);
      const existingImport = existingImports.get(relativePath);
      
      if (!existingImport) {
        // Need to add new import
        missingImports.push({
          symbolName,
          filePath: symbolRecord.filePath,
          relativePath,
          namedImports: symbolRecord.exports,
          defaultImport: symbolRecord.exports.length === 1 ? symbolRecord.exports[0] : undefined
        });
      } else {
        // Check if the specific symbol is imported
        const namedImports = existingImport.getNamedImports().map(named => named.getName());
        const defaultImport = existingImport.getDefaultImport()?.getText();
        
        const isImported = symbolRecord.exports.some(exportName => 
          namedImports.includes(exportName) || defaultImport === exportName
        );
        
        if (!isImported) {
          // Need to add to existing import
          missingImports.push({
            symbolName,
            filePath: symbolRecord.filePath,
            relativePath,
            namedImports: symbolRecord.exports.filter(exp => !namedImports.includes(exp)),
            defaultImport: symbolRecord.exports.length === 1 ? symbolRecord.exports[0] : undefined
          });
        }
      }
    });
    
    return missingImports;
  }

  /**
   * Add missing imports to a source file
   */
  private async addMissingImports(sourceFile: SourceFile, missingImports: ImportResolution[]): Promise<void> {
    missingImports.forEach(importRes => {
      const existingImport = sourceFile.getImportDeclarations().find(imp => 
        imp.getModuleSpecifierValue() === importRes.relativePath
      );
      
      if (existingImport) {
        // Add to existing import
        importRes.namedImports.forEach(namedImport => {
          const existingNamedImports = existingImport.getNamedImports().map(named => named.getName());
          if (!existingNamedImports.includes(namedImport)) {
            existingImport.addNamedImport(namedImport);
          }
        });
      } else {
        // Create new import
        if (importRes.defaultImport) {
          sourceFile.addImportDeclaration({
            moduleSpecifier: importRes.relativePath,
            defaultImport: importRes.defaultImport
          });
        } else {
          sourceFile.addImportDeclaration({
            moduleSpecifier: importRes.relativePath,
            namedImports: importRes.namedImports
          });
        }
      }
    });
  }

  /**
   * Calculate relative path between two files
   */
  private calculateRelativePath(fromPath: string, toPath: string): string {
    const fromDir = path.dirname(fromPath);
    const relativePath = path.relative(fromDir, toPath).replace(/\\/g, '/');
    
    // Ensure path starts with ./
    if (!relativePath.startsWith('.')) {
      return `./${relativePath}`;
    }
    
    return relativePath;
  }

  /**
   * Analyze imports in a file and provide suggestions
   */
  analyzeImports(filePath: string): ImportAnalysis {
    try {
      const sourceFile = this.project.getSourceFileOrThrow(filePath);
      const existingImports = this.getExistingImports(sourceFile);
      const usedSymbols = this.getUsedSymbols(sourceFile);
      
      const missingImports: string[] = [];
      const unusedImports: string[] = [];
      const duplicateImports: string[] = [];
      const suggestions: ImportResolution[] = [];
      
      // Check for missing imports
      usedSymbols.forEach(symbolName => {
        const symbolRecord = this.symbolTable.get(symbolName);
        if (symbolRecord) {
          const relativePath = this.calculateRelativePath(filePath, symbolRecord.filePath);
          const existingImport = existingImports.get(relativePath);
          
          if (!existingImport) {
            missingImports.push(symbolName);
            suggestions.push({
              symbolName,
              filePath: symbolRecord.filePath,
              relativePath,
              namedImports: symbolRecord.exports,
              defaultImport: symbolRecord.exports.length === 1 ? symbolRecord.exports[0] : undefined
            });
          }
        }
      });
      
      // Check for unused imports
      sourceFile.getImportDeclarations().forEach(importDecl => {
        const namedImports = importDecl.getNamedImports().map(named => named.getName());
        const defaultImport = importDecl.getDefaultImport()?.getText();
        
        const allImports = [...namedImports];
        if (defaultImport) allImports.push(defaultImport);
        
        allImports.forEach(importName => {
          if (!usedSymbols.includes(importName)) {
            unusedImports.push(importName);
          }
        });
      });
      
      // Check for duplicate imports
      const importCounts = new Map<string, number>();
      sourceFile.getImportDeclarations().forEach(importDecl => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (moduleSpecifier) {
          importCounts.set(moduleSpecifier, (importCounts.get(moduleSpecifier) || 0) + 1);
        }
      });
      
      importCounts.forEach((count, moduleSpecifier) => {
        if (count > 1) {
          duplicateImports.push(moduleSpecifier);
        }
      });
      
      return {
        missingImports,
        unusedImports,
        duplicateImports,
        suggestions
      };
    } catch (error) {
      console.error(`[ImportResolver] Error analyzing imports for ${filePath}:`, error);
      return {
        missingImports: [],
        unusedImports: [],
        duplicateImports: [],
        suggestions: []
      };
    }
  }

  /**
   * Get used symbols from a source file
   */
  private getUsedSymbols(sourceFile: SourceFile): string[] {
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
        
        usedSymbols.add(name);
      }
    });
    
    return [...usedSymbols];
  }

  /**
   * Clean up unused imports
   */
  async cleanupUnusedImports(filePath: string): Promise<void> {
    try {
      const sourceFile = this.project.getSourceFileOrThrow(filePath);
      const analysis = this.analyzeImports(filePath);
      
      // Remove unused named imports
      sourceFile.getImportDeclarations().forEach(importDecl => {
        const namedImports = importDecl.getNamedImports();
        const unusedNamedImports = namedImports.filter(named => 
          analysis.unusedImports.includes(named.getName())
        );
        
        unusedNamedImports.forEach(namedImport => {
          namedImport.remove();
        });
        
        // Remove entire import declaration if no named imports remain
        if (importDecl.getNamedImports().length === 0 && !importDecl.getDefaultImport()) {
          importDecl.remove();
        }
      });
      
      await sourceFile.save();
    } catch (error) {
      console.error(`[ImportResolver] Error cleaning up unused imports for ${filePath}:`, error);
    }
  }

  /**
   * Consolidate duplicate imports
   */
  async consolidateDuplicateImports(filePath: string): Promise<void> {
    try {
      const sourceFile = this.project.getSourceFileOrThrow(filePath);
      const analysis = this.analyzeImports(filePath);
      
      // Group imports by module specifier
      const importGroups = new Map<string, ImportDeclaration[]>();
      sourceFile.getImportDeclarations().forEach(importDecl => {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (moduleSpecifier) {
          const group = importGroups.get(moduleSpecifier) || [];
          group.push(importDecl);
          importGroups.set(moduleSpecifier, group);
        }
      });
      
      // Consolidate duplicate imports
      importGroups.forEach((imports, moduleSpecifier) => {
        if (imports.length > 1) {
          const firstImport = imports[0];
          const otherImports = imports.slice(1);
          
          // Collect all named imports
          const allNamedImports = new Set<string>();
          imports.forEach(imp => {
            imp.getNamedImports().forEach(named => {
              allNamedImports.add(named.getName());
            });
          });
          
          // Clear and re-add all named imports to first import
          firstImport.removeNamedImports();
          allNamedImports.forEach(namedImport => {
            firstImport.addNamedImport(namedImport);
          });
          
          // Remove other imports
          otherImports.forEach(imp => imp.remove());
        }
      });
      
      await sourceFile.save();
    } catch (error) {
      console.error(`[ImportResolver] Error consolidating duplicate imports for ${filePath}:`, error);
    }
  }

  /**
   * Organize imports (sort, group, etc.)
   */
  async organizeImports(filePath: string): Promise<void> {
    try {
      const sourceFile = this.project.getSourceFileOrThrow(filePath);
      
      // Get all import declarations
      const imports = sourceFile.getImportDeclarations();
      
      // Sort imports by module specifier
      const sortedImports = imports.sort((a, b) => {
        const aSpecifier = a.getModuleSpecifierValue() || '';
        const bSpecifier = b.getModuleSpecifierValue() || '';
        return aSpecifier.localeCompare(bSpecifier);
      });
      
      // Remove all imports and re-add them in sorted order
      imports.forEach(imp => imp.remove());
      
      sortedImports.forEach(imp => {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        const namedImports = imp.getNamedImports().map(named => named.getName());
        const defaultImport = imp.getDefaultImport()?.getText();
        
        if (defaultImport) {
          sourceFile.addImportDeclaration({
            moduleSpecifier: moduleSpecifier || '',
            defaultImport
          });
        } else if (namedImports.length > 0) {
          sourceFile.addImportDeclaration({
            moduleSpecifier: moduleSpecifier || '',
            namedImports
          });
        }
      });
      
      await sourceFile.save();
    } catch (error) {
      console.error(`[ImportResolver] Error organizing imports for ${filePath}:`, error);
    }
  }
}

export default ImportResolver; 