import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Advanced symbol graph interfaces
export interface SemanticSymbol {
  id: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'type' | 'method' | 'property' | 'enum' | 'namespace';
  location: {
    file: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  };
  signature?: string;
  parameters?: Array<{ name: string; type: string; required: boolean; description?: string }>;
  returnType?: string;
  visibility?: 'public' | 'private' | 'protected';
  description?: string;
  dependencies: string[];
  dependents: string[];
  complexity: number;
  usageCount: number;
  lastModified: Date;
  tags: string[];
  semanticHash: string;
}

export interface FileSemanticContext {
  path: string;
  content: string;
  symbols: SemanticSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  ast: ts.SourceFile;
  semanticHash: string;
  lastModified: Date;
  complexity: number;
  symbolCount: number;
}

export interface ImportInfo {
  module: string;
  imports: Array<{ name: string; alias?: string; isDefault?: boolean }>;
  location: { line: number; column: number };
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'namespace';
  location: { line: number; column: number };
}

export interface SemanticIndex {
  symbols: Map<string, SemanticSymbol>;
  files: Map<string, FileSemanticContext>;
  dependencyGraph: Map<string, Set<string>>;
  reverseDependencyGraph: Map<string, Set<string>>;
  symbolUsageGraph: Map<string, Set<string>>;
  semanticEmbeddings: Map<string, number[]>;
  projectRoot: string;
  lastIndexed: Date;
  totalSymbols: number;
  totalFiles: number;
}

export interface ContextQuery {
  currentFile?: string;
  cursorPosition?: { line: number; column: number };
  query: string;
  contextWindow: number;
  maxResults: number;
  includeTypes?: boolean;
  includeFunctions?: boolean;
  includeClasses?: boolean;
  semanticSimilarity?: boolean;
}

export interface ContextResult {
  symbols: SemanticSymbol[];
  files: FileSemanticContext[];
  relevance: number;
  context: string;
  suggestions: string[];
}

export class SemanticIndexManager {
  private index: SemanticIndex;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private isIndexing: boolean = false;
  private indexingQueue: string[] = [];

  constructor(projectRoot: string) {
    this.index = {
      symbols: new Map(),
      files: new Map(),
      dependencyGraph: new Map(),
      reverseDependencyGraph: new Map(),
      symbolUsageGraph: new Map(),
      semanticEmbeddings: new Map(),
      projectRoot,
      lastIndexed: new Date(),
      totalSymbols: 0,
      totalFiles: 0
    };
  }

  /**
   * Initialize the semantic index for the entire project
   */
  async initializeIndex(): Promise<void> {
    console.log('[SemanticIndexManager] Initializing semantic index...');
    
    try {
      // Find all TypeScript/JavaScript files
      const files = this.findSourceFiles(this.index.projectRoot);
      
      // Index files in parallel with dependency ordering
      const dependencyOrder = this.calculateDependencyOrder(files);
      
      for (const filePath of dependencyOrder) {
        await this.indexFile(filePath);
      }
      
      // Build cross-file relationships
      this.buildCrossFileRelationships();
      
      // Generate semantic embeddings
      await this.generateSemanticEmbeddings();
      
      // Set up file watchers for real-time updates
      this.setupFileWatchers();
      
      console.log(`[SemanticIndexManager] Indexed ${this.index.totalFiles} files with ${this.index.totalSymbols} symbols`);
      
    } catch (error) {
      console.error('[SemanticIndexManager] Index initialization failed:', error);
      throw error;
    }
  }

  /**
   * Index a single file with advanced semantic analysis
   */
  private async indexFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const symbols: SemanticSymbol[] = [];
      const imports: ImportInfo[] = [];
      const exports: ExportInfo[] = [];
      const dependencies: string[] = [];

      // Extract symbols with advanced semantic analysis
      this.extractSemanticSymbols(sourceFile, symbols, imports, exports, dependencies);

      // Calculate semantic hash for change detection
      const semanticHash = this.calculateSemanticHash(content, symbols);

      const fileContext: FileSemanticContext = {
        path: filePath,
        content,
        symbols,
        imports,
        exports,
        dependencies,
        ast: sourceFile,
        semanticHash,
        lastModified: new Date(),
        complexity: this.calculateFileComplexity(symbols),
        symbolCount: symbols.length
      };

      // Update index
      this.index.files.set(filePath, fileContext);
      
      // Add symbols to global symbol table
      for (const symbol of symbols) {
        this.index.symbols.set(symbol.id, symbol);
      }

      // Update dependency graphs
      this.updateDependencyGraphs(filePath, dependencies);

      this.index.totalFiles++;
      this.index.totalSymbols += symbols.length;

    } catch (error) {
      console.error(`[SemanticIndexManager] Failed to index ${filePath}:`, error);
    }
  }

  /**
   * Extract semantic symbols with advanced analysis
   */
  private extractSemanticSymbols(
    sourceFile: ts.SourceFile,
    symbols: SemanticSymbol[],
    imports: ImportInfo[],
    exports: ExportInfo[],
    dependencies: string[]
  ): void {
    const visit = (node: ts.Node) => {
      // Extract imports with semantic analysis
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImportInfo(node, sourceFile);
        imports.push(importInfo);
        dependencies.push(importInfo.module);
      }

      // Extract exports
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        const exportInfo = this.extractExportInfo(node, sourceFile);
        exports.push(exportInfo);
      }

      // Extract function declarations with semantic analysis
      if (ts.isFunctionDeclaration(node) && node.name) {
        const symbol = this.createSemanticSymbol(node, 'function', sourceFile);
        symbols.push(symbol);
      }

      // Extract class declarations with method analysis
      if (ts.isClassDeclaration(node) && node.name) {
        const classSymbol = this.createSemanticSymbol(node, 'class', sourceFile);
        symbols.push(classSymbol);
        
        // Extract class methods and properties
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodSymbol = this.createMethodSymbol(member, classSymbol.name, sourceFile);
            symbols.push(methodSymbol);
          } else if (ts.isPropertyDeclaration(member) && member.name) {
            const propertySymbol = this.createPropertySymbol(member, classSymbol.name, sourceFile);
            symbols.push(propertySymbol);
          }
        });
      }

      // Extract interface declarations
      if (ts.isInterfaceDeclaration(node)) {
        const symbol = this.createSemanticSymbol(node, 'interface', sourceFile);
        symbols.push(symbol);
      }

      // Extract type declarations
      if (ts.isTypeAliasDeclaration(node)) {
        const symbol = this.createSemanticSymbol(node, 'type', sourceFile);
        symbols.push(symbol);
      }

      // Extract variable declarations with semantic analysis
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(declaration => {
          if (declaration.name && ts.isIdentifier(declaration.name)) {
            const symbol = this.createVariableSymbol(declaration, sourceFile);
            symbols.push(symbol);
          }
        });
      }

      // Extract enum declarations
      if (ts.isEnumDeclaration(node)) {
        const symbol = this.createSemanticSymbol(node, 'enum', sourceFile);
        symbols.push(symbol);
      }

      // Extract namespace declarations
      if (ts.isModuleDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        const symbol = this.createSemanticSymbol(node, 'namespace', sourceFile);
        symbols.push(symbol);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * Create semantic symbol with advanced metadata
   */
  private createSemanticSymbol(
    node: ts.Node,
    type: SemanticSymbol['type'],
    sourceFile: ts.SourceFile
  ): SemanticSymbol {
    const name = this.getNodeName(node);
    const location = this.getNodeLocation(node, sourceFile);
    const signature = this.getNodeSignature(node);
    const parameters = this.getNodeParameters(node);
    const returnType = this.getNodeReturnType(node);
    const visibility = this.getNodeVisibility(node);
    const description = this.extractNodeDescription(node, sourceFile);
    const complexity = this.calculateNodeComplexity(node);
    const tags = this.extractNodeTags(node, sourceFile);

    const symbol: SemanticSymbol = {
      id: this.generateSymbolId(name, location.file, type),
      name,
      type,
      location,
      signature,
      parameters,
      returnType,
      visibility,
      description,
      dependencies: [],
      dependents: [],
      complexity,
      usageCount: 0,
      lastModified: new Date(),
      tags,
      semanticHash: this.calculateSymbolHash(node, sourceFile)
    };

    return symbol;
  }

  /**
   * Create method symbol with class context
   */
  private createMethodSymbol(
    node: ts.MethodDeclaration,
    className: string,
    sourceFile: ts.SourceFile
  ): SemanticSymbol {
    const methodName = this.getPropertyName(node.name);
    const fullName = `${className}.${methodName}`;
    const location = this.getNodeLocation(node, sourceFile);
    
    const symbol: SemanticSymbol = {
      id: this.generateSymbolId(fullName, location.file, 'method'),
      name: fullName,
      type: 'method',
      location,
      signature: this.getMethodSignature(node),
      parameters: this.getFunctionParameters(node),
      returnType: this.getReturnType(node),
      visibility: this.getVisibility(node),
      description: this.extractNodeDescription(node, sourceFile),
      dependencies: [],
      dependents: [],
      complexity: this.calculateNodeComplexity(node),
      usageCount: 0,
      lastModified: new Date(),
      tags: this.extractNodeTags(node, sourceFile),
      semanticHash: this.calculateSymbolHash(node, sourceFile)
    };

    return symbol;
  }

  /**
   * Create property symbol with class context
   */
  private createPropertySymbol(
    node: ts.PropertyDeclaration,
    className: string,
    sourceFile: ts.SourceFile
  ): SemanticSymbol {
    const propertyName = this.getPropertyName(node.name);
    const fullName = `${className}.${propertyName}`;
    const location = this.getNodeLocation(node, sourceFile);
    
    const symbol: SemanticSymbol = {
      id: this.generateSymbolId(fullName, location.file, 'property'),
      name: fullName,
      type: 'property',
      location,
      signature: this.getPropertySignature(node),
      returnType: this.getPropertyType(node),
      visibility: this.getVisibility(node),
      description: this.extractNodeDescription(node, sourceFile),
      dependencies: [],
      dependents: [],
      complexity: this.calculateNodeComplexity(node),
      usageCount: 0,
      lastModified: new Date(),
      tags: this.extractNodeTags(node, sourceFile),
      semanticHash: this.calculateSymbolHash(node, sourceFile)
    };

    return symbol;
  }

  /**
   * Create variable symbol with semantic analysis
   */
  private createVariableSymbol(
    declaration: ts.VariableDeclaration,
    sourceFile: ts.SourceFile
  ): SemanticSymbol {
    const name = this.getVariableName(declaration.name);
    const location = this.getNodeLocation(declaration, sourceFile);
    
    const symbol: SemanticSymbol = {
      id: this.generateSymbolId(name, location.file, 'variable'),
      name,
      type: 'variable',
      location,
      signature: this.getVariableSignature(declaration),
      returnType: declaration.type ? declaration.type.getText() : 'any',
      visibility: 'public',
      description: this.extractNodeDescription(declaration, sourceFile),
      dependencies: [],
      dependents: [],
      complexity: this.calculateNodeComplexity(declaration),
      usageCount: 0,
      lastModified: new Date(),
      tags: this.extractNodeTags(declaration, sourceFile),
      semanticHash: this.calculateSymbolHash(declaration, sourceFile)
    };

    return symbol;
  }

  /**
   * Get variable name from binding name
   */
  private getVariableName(bindingName: ts.BindingName): string {
    if (ts.isIdentifier(bindingName)) {
      return bindingName.text;
    } else if (ts.isObjectBindingPattern(bindingName)) {
      return 'object';
    } else if (ts.isArrayBindingPattern(bindingName)) {
      return 'array';
    }
    return 'unknown';
  }

  /**
   * Get variable signature
   */
  private getVariableSignature(declaration: ts.VariableDeclaration): string {
    const name = this.getVariableName(declaration.name);
    const type = declaration.type ? declaration.type.getText() : 'any';
    return `${name}: ${type}`;
  }

  /**
   * Extract import information with semantic analysis
   */
  private extractImportInfo(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo {
    const module = (node.moduleSpecifier as ts.StringLiteral).text;
    const imports: Array<{ name: string; alias?: string; isDefault?: boolean }> = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        imports.push({
          name: node.importClause.name.text,
          isDefault: true
        });
      }

      // Named imports
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          imports.push({
            name: element.propertyName?.text || element.name.text,
            alias: element.propertyName ? element.name.text : undefined
          });
        });
      }
    }

    return {
      module,
      imports,
      location: this.getNodeLocation(node, sourceFile)
    };
  }

  /**
   * Extract export information
   */
  private extractExportInfo(node: ts.ExportDeclaration | ts.ExportAssignment, sourceFile: ts.SourceFile): ExportInfo {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        return {
          name: node.exportClause.elements[0]?.name.text || 'unknown',
          type: 'named',
          location: this.getNodeLocation(node, sourceFile)
        };
      }
    } else if (ts.isExportAssignment(node)) {
      return {
        name: 'default',
        type: 'default',
        location: this.getNodeLocation(node, sourceFile)
      };
    }

    return {
      name: 'unknown',
      type: 'named',
      location: this.getNodeLocation(node, sourceFile)
    };
  }

  /**
   * Build cross-file relationships and symbol usage
   */
  private buildCrossFileRelationships(): void {
    // Build symbol usage graph
    for (const [filePath, fileContext] of this.index.files) {
      for (const symbol of fileContext.symbols) {
        // Find symbol usages in other files
        for (const [otherFilePath, otherContext] of this.index.files) {
          if (filePath !== otherFilePath) {
            const usages = this.findSymbolUsages(symbol, otherContext);
            for (const usage of usages) {
              this.addSymbolUsage(symbol.id, usage);
            }
          }
        }
      }
    }

    // Build dependency relationships
    for (const [filePath, fileContext] of this.index.files) {
      for (const symbol of fileContext.symbols) {
        for (const importInfo of fileContext.imports) {
          for (const importItem of importInfo.imports) {
            const importedSymbol = this.findImportedSymbol(importItem.name, importInfo.module);
            if (importedSymbol) {
              this.addSymbolDependency(symbol.id, importedSymbol.id);
            }
          }
        }
      }
    }
  }

  /**
   * Generate semantic embeddings for similarity search
   */
  private async generateSemanticEmbeddings(): Promise<void> {
    // This would integrate with an embedding model (OpenAI, local, etc.)
    // For now, we'll create simple hash-based embeddings
    for (const [symbolId, symbol] of this.index.symbols) {
      const embedding = this.createSimpleEmbedding(symbol);
      this.index.semanticEmbeddings.set(symbolId, embedding);
    }
  }

  /**
   * Query the semantic index for relevant context
   */
  async queryContext(query: ContextQuery): Promise<ContextResult> {
    const results: SemanticSymbol[] = [];
    const files: FileSemanticContext[] = [];
    let relevance = 0;

    // Semantic similarity search
    if (query.semanticSimilarity) {
      const similarSymbols = this.findSemanticallySimilarSymbols(query.query);
      results.push(...similarSymbols);
    }

    // Exact name matching
    const exactMatches = this.findExactMatches(query.query);
    results.push(...exactMatches);

    // Type-based filtering
    if (query.includeTypes !== undefined) {
      results.filter(symbol => symbol.type === 'type' === query.includeTypes);
    }
    if (query.includeFunctions !== undefined) {
      results.filter(symbol => symbol.type === 'function' === query.includeFunctions);
    }
    if (query.includeClasses !== undefined) {
      results.filter(symbol => symbol.type === 'class' === query.includeClasses);
    }

    // Get related files
    for (const symbol of results) {
      const file = this.index.files.get(symbol.location.file);
      if (file && !files.includes(file)) {
        files.push(file);
      }
    }

    // Calculate relevance score
    relevance = this.calculateRelevanceScore(results, query);

    // Generate context and suggestions
    const context = this.generateContextString(results, files, query);
    const suggestions = this.generateSuggestions(results, query);

    return {
      symbols: results.slice(0, query.maxResults),
      files: files.slice(0, query.maxResults),
      relevance,
      context,
      suggestions
    };
  }

  /**
   * Find semantically similar symbols
   */
  private findSemanticallySimilarSymbols(query: string): SemanticSymbol[] {
    const queryEmbedding = this.createSimpleEmbedding({ name: query, description: query });
    const similarities: Array<{ symbol: SemanticSymbol; similarity: number }> = [];

    for (const [symbolId, symbol] of this.index.symbols) {
      const symbolEmbedding = this.index.semanticEmbeddings.get(symbolId);
      if (symbolEmbedding) {
        const similarity = this.calculateCosineSimilarity(queryEmbedding, symbolEmbedding);
        similarities.push({ symbol, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.symbol);
  }

  /**
   * Find exact matches by name
   */
  private findExactMatches(query: string): SemanticSymbol[] {
    const results: SemanticSymbol[] = [];
    
    for (const [symbolId, symbol] of this.index.symbols) {
      if (symbol.name.toLowerCase().includes(query.toLowerCase()) ||
          symbol.description?.toLowerCase().includes(query.toLowerCase())) {
        results.push(symbol);
      }
    }

    return results;
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(symbols: SemanticSymbol[], query: ContextQuery): number {
    let score = 0;
    
    for (const symbol of symbols) {
      // Name match
      if (symbol.name.toLowerCase().includes(query.query.toLowerCase())) {
        score += 10;
      }
      
      // Description match
      if (symbol.description?.toLowerCase().includes(query.query.toLowerCase())) {
        score += 5;
      }
      
      // Usage frequency
      score += Math.min(symbol.usageCount, 10);
      
      // Recency
      const daysSinceModified = (Date.now() - symbol.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - daysSinceModified);
    }

    return score / symbols.length;
  }

  /**
   * Generate context string for AI prompts
   */
  private generateContextString(
    symbols: SemanticSymbol[],
    files: FileSemanticContext[],
    query: ContextQuery
  ): string {
    let context = '';

    // Add current file context
    if (query.currentFile) {
      const currentFile = this.index.files.get(query.currentFile);
      if (currentFile) {
        context += `Current file: ${query.currentFile}\n`;
        context += `File symbols: ${currentFile.symbols.map(s => s.name).join(', ')}\n\n`;
      }
    }

    // Add relevant symbols
    if (symbols.length > 0) {
      context += 'Relevant symbols:\n';
      for (const symbol of symbols.slice(0, 5)) {
        context += `- ${symbol.name} (${symbol.type}): ${symbol.description || 'No description'}\n`;
        if (symbol.signature) {
          context += `  Signature: ${symbol.signature}\n`;
        }
      }
      context += '\n';
    }

    // Add related files
    if (files.length > 0) {
      context += 'Related files:\n';
      for (const file of files.slice(0, 3)) {
        context += `- ${file.path}: ${file.symbols.length} symbols\n`;
      }
      context += '\n';
    }

    return context;
  }

  /**
   * Generate suggestions based on search results
   */
  private generateSuggestions(symbols: SemanticSymbol[], query: ContextQuery): string[] {
    const suggestions: string[] = [];
    
    // Suggest similar symbols
    for (const symbol of symbols.slice(0, 3)) {
      suggestions.push(`Use ${symbol.name} for ${symbol.description || 'similar functionality'}`);
    }

    // Suggest related patterns
    const patterns = this.extractPatterns(symbols);
    for (const pattern of patterns) {
      suggestions.push(`Consider using ${pattern} pattern`);
    }

    return suggestions;
  }

  // Helper methods
  private getNodeName(node: ts.Node): string {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (ts.isElementAccessExpression(node)) return 'indexed';
    return 'unknown';
  }

  private getNodeLocation(node: ts.Node, sourceFile: ts.SourceFile): { file: string; line: number; column: number; endLine: number; endColumn: number } {
    const { line: startLine, character: startChar } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const { line: endLine, character: endChar } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    return {
      file: sourceFile.fileName,
      line: startLine + 1,
      column: startChar + 1,
      endLine: endLine + 1,
      endColumn: endChar + 1
    };
  }

  private getNodeSignature(node: ts.Node): string {
    return node.getText();
  }

  private getNodeParameters(node: ts.Node): Array<{ name: string; type: string; required: boolean; description?: string }> {
    const parameters: Array<{ name: string; type: string; required: boolean; description?: string }> = [];
    
    if (ts.isFunctionLike(node) && node.parameters) {
      for (const param of node.parameters) {
        parameters.push({
          name: param.name.getText(),
          type: param.type ? param.type.getText() : 'any',
          required: !param.questionToken,
          description: this.extractParameterDescription(param)
        });
      }
    }
    
    return parameters;
  }

  private getNodeReturnType(node: ts.Node): string {
    if (ts.isFunctionLike(node) && node.type) {
      return node.type.getText();
    }
    return 'void';
  }

  private getNodeVisibility(node: ts.Node): 'public' | 'private' | 'protected' {
    if (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) {
      if (node.modifiers) {
        for (const modifier of node.modifiers) {
          if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
          if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
        }
      }
    }
    return 'public';
  }

  private extractNodeDescription(node: ts.Node, sourceFile: ts.SourceFile): string {
    // Extract JSDoc comments
    const trivia = sourceFile.getFullText().substring(0, node.getLeadingTriviaWidth(sourceFile));
    const jsDocMatch = trivia.match(/\/\*\*([\s\S]*?)\*\//);
    return jsDocMatch ? jsDocMatch[1].replace(/\*/g, '').trim() : '';
  }

  private calculateNodeComplexity(node: ts.Node): number {
    let complexity = 1;
    
    // Count control flow statements
    const controlFlowKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'finally'];
    const text = node.getText();
    
    for (const keyword of controlFlowKeywords) {
      const matches = text.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  private extractNodeTags(node: ts.Node, sourceFile: ts.SourceFile): string[] {
    const tags: string[] = [];
    const description = this.extractNodeDescription(node, sourceFile);
    
    // Extract @tags from JSDoc
    const tagMatches = description.match(/@(\w+)/g);
    if (tagMatches) {
      tags.push(...tagMatches.map(tag => tag.substring(1)));
    }
    
    // Add type-based tags
    if (ts.isFunctionLike(node) && (node as any).modifiers?.some((m: any) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
      tags.push('async');
    }
    if (ts.isExportDeclaration(node)) tags.push('export');
    if (ts.isImportDeclaration(node)) tags.push('import');
    
    return tags;
  }

  private calculateSemanticHash(content: string, symbols: SemanticSymbol[]): string {
    const hashInput = content + symbols.map(s => s.name + s.type).join('');
    return require('crypto').createHash('sha256').update(hashInput).digest('hex');
  }

  private calculateSymbolHash(node: ts.Node, sourceFile: ts.SourceFile): string {
    const hashInput = node.getText() + this.getNodeLocation(node, sourceFile).file;
    return require('crypto').createHash('sha256').update(hashInput).digest('hex');
  }

  private generateSymbolId(name: string, file: string, type: string): string {
    return `${type}:${name}:${path.basename(file)}`;
  }

  private findSourceFiles(root: string): string[] {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(root);
    return files;
  }

  private calculateDependencyOrder(files: string[]): string[] {
    // Simple dependency ordering - in production, use topological sort
    return files.sort();
  }

  private updateDependencyGraphs(filePath: string, dependencies: string[]): void {
    this.index.dependencyGraph.set(filePath, new Set(dependencies));
    
    for (const dep of dependencies) {
      if (!this.index.reverseDependencyGraph.has(dep)) {
        this.index.reverseDependencyGraph.set(dep, new Set());
      }
      this.index.reverseDependencyGraph.get(dep)!.add(filePath);
    }
  }

  private findSymbolUsages(symbol: SemanticSymbol, context: FileSemanticContext): string[] {
    const usages: string[] = [];
    const symbolName = symbol.name.split('.').pop() || symbol.name;
    
    // Simple text-based usage detection
    if (context.content.includes(symbolName)) {
      usages.push(context.path);
    }
    
    return usages;
  }

  private addSymbolUsage(symbolId: string, usage: string): void {
    if (!this.index.symbolUsageGraph.has(symbolId)) {
      this.index.symbolUsageGraph.set(symbolId, new Set());
    }
    this.index.symbolUsageGraph.get(symbolId)!.add(usage);
  }

  private addSymbolDependency(fromId: string, toId: string): void {
    const fromSymbol = this.index.symbols.get(fromId);
    if (fromSymbol) {
      fromSymbol.dependencies.push(toId);
    }
    
    const targetSymbol = this.index.symbols.get(toId);
    if (targetSymbol) {
      targetSymbol.dependents.push(fromId);
    }
  }

  private findImportedSymbol(name: string, module: string): SemanticSymbol | undefined {
    // Find symbol in the imported module
    for (const [symbolId, symbol] of this.index.symbols) {
      if (symbol.name === name && symbol.location.file.includes(module)) {
        return symbol;
      }
    }
    return undefined;
  }

  private createSimpleEmbedding(symbol: { name: string; description?: string }): number[] {
    // Simple hash-based embedding - in production, use proper embedding models
    const text = `${symbol.name} ${symbol.description || ''}`;
    const hash = require('crypto').createHash('md5').update(text).digest('hex');
    
    // Convert hash to 128-dimensional vector
    const embedding: number[] = [];
    for (let i = 0; i < 128; i += 2) {
      const hexPair = hash.substr(i, 2);
      embedding.push(parseInt(hexPair, 16) / 255);
    }
    
    return embedding;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateFileComplexity(symbols: SemanticSymbol[]): number {
    return symbols.reduce((total, symbol) => total + symbol.complexity, 0);
  }

  private extractParameterDescription(param: ts.ParameterDeclaration): string {
    // Extract parameter description from JSDoc
    const jsDoc = param.parent.getLeadingTriviaWidth(param.getSourceFile());
    if (jsDoc > 0) {
      const trivia = param.getSourceFile().getFullText().substring(0, jsDoc);
      const paramMatch = trivia.match(new RegExp(`@param\\s+\\{[^}]*\\}\\s+${param.name.getText()}\\s+(.+)`, 'i'));
      return paramMatch ? paramMatch[1].trim() : '';
    }
    return '';
  }

  private getPropertyName(name: ts.PropertyName): string {
    if (ts.isIdentifier(name)) return name.text;
    if (ts.isStringLiteral(name)) return name.text;
    if (ts.isNumericLiteral(name)) return name.text;
    return 'unknown';
  }

  private getMethodSignature(node: ts.MethodDeclaration): string {
    return `${this.getPropertyName(node.name)}(${node.parameters.map(p => p.getText()).join(', ')}): ${node.type ? node.type.getText() : 'void'}`;
  }

  private getFunctionParameters(node: ts.FunctionLikeDeclaration): Array<{ name: string; type: string; required: boolean }> {
    return node.parameters.map(param => ({
      name: param.name.getText(),
      type: param.type ? param.type.getText() : 'any',
      required: !param.questionToken
    }));
  }

  private getReturnType(node: ts.FunctionLikeDeclaration): string {
    return node.type ? node.type.getText() : 'void';
  }

  private getVisibility(node: ts.MethodDeclaration | ts.PropertyDeclaration): 'public' | 'private' | 'protected' {
    if (node.modifiers) {
      for (const modifier of node.modifiers) {
        if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
        if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
      }
    }
    return 'public';
  }

  private getPropertySignature(node: ts.PropertyDeclaration): string {
    return `${this.getPropertyName(node.name)}: ${node.type ? node.type.getText() : 'any'}`;
  }

  private getPropertyType(node: ts.PropertyDeclaration): string {
    return node.type ? node.type.getText() : 'any';
  }

  private extractPatterns(symbols: SemanticSymbol[]): string[] {
    const patterns: string[] = [];
    
    // Detect common patterns
    const hasAsync = symbols.some(s => s.tags.includes('async'));
    const hasExport = symbols.some(s => s.tags.includes('export'));
    const hasInterface = symbols.some(s => s.type === 'interface');
    
    if (hasAsync) patterns.push('async/await');
    if (hasExport) patterns.push('module exports');
    if (hasInterface) patterns.push('interface contracts');
    
    return patterns;
  }

  private setupFileWatchers(): void {
    // Set up file watchers for real-time updates
    for (const [filePath] of this.index.files) {
      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          this.queueFileUpdate(filePath);
        }
      });
      this.watchers.set(filePath, watcher);
    }
  }

  private queueFileUpdate(filePath: string): void {
    if (!this.indexingQueue.includes(filePath)) {
      this.indexingQueue.push(filePath);
      this.processIndexingQueue();
    }
  }

  private async processIndexingQueue(): Promise<void> {
    if (this.isIndexing || this.indexingQueue.length === 0) return;
    
    this.isIndexing = true;
    
    try {
      const filePath = this.indexingQueue.shift()!;
      await this.indexFile(filePath);
      this.buildCrossFileRelationships();
    } finally {
      this.isIndexing = false;
      
      if (this.indexingQueue.length > 0) {
        setTimeout(() => this.processIndexingQueue(), 100);
      }
    }
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    totalFiles: number;
    totalSymbols: number;
    lastIndexed: Date;
    averageComplexity: number;
    mostUsedSymbols: Array<{ name: string; usageCount: number }>;
  } {
    const totalComplexity = Array.from(this.index.symbols.values())
      .reduce((sum, symbol) => sum + symbol.complexity, 0);
    
    const averageComplexity = this.index.totalSymbols > 0 
      ? totalComplexity / this.index.totalSymbols 
      : 0;

    const mostUsedSymbols = Array.from(this.index.symbols.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(symbol => ({ name: symbol.name, usageCount: symbol.usageCount }));

    return {
      totalFiles: this.index.totalFiles,
      totalSymbols: this.index.totalSymbols,
      lastIndexed: this.index.lastIndexed,
      averageComplexity,
      mostUsedSymbols
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    for (const [filePath, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
}

export default SemanticIndexManager; 