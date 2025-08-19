import { Project, Node, SyntaxKind, SourceFile, Identifier, HeritageClause, ImportDeclaration, ExportDeclaration } from "ts-morph";

export interface UsedSymbol {
  name: string;
  kind: 'import' | 'export' | 'reference' | 'method-call' | 'property-access';
  location: {
    line: number;
    column: number;
  };
  context?: string;
}

export interface SymbolUsage {
  filePath: string;
  symbols: UsedSymbol[];
  imports: string[];
  exports: string[];
  dependencies: string[];
}

export function collectUsedSymbols(project: Project, filePath: string): SymbolUsage {
  const out = new Set<string>();
  const symbols: UsedSymbol[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  const dependencies: string[] = [];

  try {
    const sf = project.getSourceFileOrThrow(filePath);
    
    // Collect all identifiers
    sf.forEachDescendant((node) => {
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
        
        // Skip if it's a method call (e.g., obj.method())
        if (parent && Node.isCallExpression(parent)) {
          const expression = parent.getExpression();
          if (Node.isPropertyAccessExpression(expression)) {
            const methodName = expression.getNameNode();
            if (methodName === node) {
              return; // Skip method names in calls
            }
          }
        }
        
        out.add(name);
        symbols.push({
          name,
          kind: 'reference',
          location: {
            line: node.getStartLineNumber(),
            column: node.getStartLineNumber()
          }
        });
      }
      
      // Collect heritage clauses (extends/implements)
      if (Node.isHeritageClause(node)) {
        node.getDescendantsOfKind(SyntaxKind.Identifier).forEach(identifier => {
          const name = identifier.getText();
          out.add(name);
          symbols.push({
            name,
            kind: 'reference',
            location: {
              line: identifier.getStartLineNumber(),
              column: identifier.getStartLineNumber()
            },
            context: 'heritage'
          });
        });
      }
      
      // Collect method calls
      if (Node.isCallExpression(node)) {
        const expression = node.getExpression();
        if (Node.isPropertyAccessExpression(expression)) {
          const methodName = expression.getNameNode();
          const methodText = methodName.getText();
          out.add(methodText);
          symbols.push({
            name: methodText,
            kind: 'method-call',
            location: {
              line: methodName.getStartLineNumber(),
              column: methodName.getStartLineNumber()
            }
          });
        } else if (Node.isIdentifier(expression)) {
          const funcName = expression.getText();
          out.add(funcName);
          symbols.push({
            name: funcName,
            kind: 'method-call',
            location: {
              line: expression.getStartLineNumber(),
              column: expression.getStartLineNumber()
            }
          });
        }
      }
      
      // Collect property access
      if (Node.isPropertyAccessExpression(node)) {
        const propertyName = node.getNameNode();
        const propertyText = propertyName.getText();
        out.add(propertyText);
        symbols.push({
          name: propertyText,
          kind: 'property-access',
          location: {
            line: propertyName.getStartLineNumber(),
            column: propertyName.getStartLineNumber()
          }
        });
      }
    });
    
    // Collect imports
    sf.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier && !moduleSpecifier.startsWith('.')) {
        // External dependency
        dependencies.push(moduleSpecifier);
      }
      
      importDecl.getNamedImports().forEach(namedImport => {
        const importName = namedImport.getName();
        imports.push(importName);
        out.add(importName);
        symbols.push({
          name: importName,
          kind: 'import',
          location: {
            line: namedImport.getStartLineNumber(),
            column: namedImport.getStartLineNumber()
          }
        });
      });
      
      // Default imports
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        const importName = defaultImport.getText();
        imports.push(importName);
        out.add(importName);
        symbols.push({
          name: importName,
          kind: 'import',
          location: {
            line: defaultImport.getStartLineNumber(),
            column: defaultImport.getStartLineNumber()
          }
        });
      }
    });
    
    // Collect exports
    sf.getExportDeclarations().forEach(exportDecl => {
      exportDecl.getNamedExports().forEach(namedExport => {
        const exportName = namedExport.getName();
        exports.push(exportName);
        out.add(exportName);
        symbols.push({
          name: exportName,
          kind: 'export',
          location: {
            line: namedExport.getStartLineNumber(),
            column: namedExport.getStartLineNumber()
          }
        });
      });
    });
    
    // Collect default exports
    const defaultExport = sf.getDefaultExportSymbol();
    if (defaultExport) {
      const exportName = defaultExport.getName();
      exports.push(exportName);
      out.add(exportName);
      symbols.push({
        name: exportName,
        kind: 'export',
        location: {
          line: 1,
          column: 1
        }
      });
    }
    
  } catch (error) {
    console.warn(`[UsedSymbols] Could not analyze file ${filePath}:`, error);
  }

  return {
    filePath,
    symbols,
    imports: [...new Set(imports)],
    exports: [...new Set(exports)],
    dependencies: [...new Set(dependencies)]
  };
}

export function collectUsedSymbolsFromString(sourceCode: string, filePath: string): SymbolUsage {
  const project = new Project({
    useInMemoryFileSystem: true
  });
  
  const sourceFile = project.createSourceFile(filePath, sourceCode);
  return collectUsedSymbols(project, filePath);
}

export function analyzeFileDependencies(project: Project, filePath: string): {
  internalDependencies: string[];
  externalDependencies: string[];
  missingSymbols: string[];
} {
  const usage = collectUsedSymbols(project, filePath);
  const internalDependencies: string[] = [];
  const externalDependencies: string[] = [];
  const missingSymbols: string[] = [];
  
  // Separate internal vs external dependencies
  usage.dependencies.forEach(dep => {
    if (dep.startsWith('.') || dep.startsWith('/')) {
      internalDependencies.push(dep);
    } else {
      externalDependencies.push(dep);
    }
  });
  
  // Check for missing symbols (symbols that are used but not imported)
  const usedSymbols = new Set(usage.symbols.map(s => s.name));
  const importedSymbols = new Set(usage.imports);
  
  usedSymbols.forEach(symbol => {
    if (!importedSymbols.has(symbol) && !usage.exports.includes(symbol)) {
      // This could be a missing import, but we need to check if it's a built-in or global
      const builtIns = ['console', 'process', 'Buffer', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'];
      const globals = ['window', 'document', 'localStorage', 'sessionStorage'];
      
      if (!builtIns.includes(symbol) && !globals.includes(symbol)) {
        missingSymbols.push(symbol);
      }
    }
  });
  
  return {
    internalDependencies,
    externalDependencies,
    missingSymbols
  };
}

export function getSymbolUsageStats(project: Project, filePaths: string[]): {
  totalFiles: number;
  totalSymbols: number;
  symbolFrequency: Record<string, number>;
  mostUsedSymbols: Array<{ symbol: string; count: number }>;
} {
  const symbolFrequency: Record<string, number> = {};
  let totalSymbols = 0;
  
  filePaths.forEach(filePath => {
    const usage = collectUsedSymbols(project, filePath);
    usage.symbols.forEach(symbol => {
      symbolFrequency[symbol.name] = (symbolFrequency[symbol.name] || 0) + 1;
      totalSymbols++;
    });
  });
  
  const mostUsedSymbols = Object.entries(symbolFrequency)
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalFiles: filePaths.length,
    totalSymbols,
    symbolFrequency,
    mostUsedSymbols
  };
}

export default {
  collectUsedSymbols,
  collectUsedSymbolsFromString,
  analyzeFileDependencies,
  getSymbolUsageStats
}; 