import { openai, OPENAI_MODEL } from '../config/aiProvider';
import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';

// Core interfaces for context-aware code generation
export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'type';
  location: string;
  signature?: string;
  parameters?: Array<{ name: string; type: string; required: boolean }>;
  returnType?: string;
  visibility?: 'public' | 'private' | 'protected';
  description?: string;
  dependencies?: string[];
}

export interface FileContext {
  path: string;
  content: string;
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
  dependencies: string[];
  ast?: ts.SourceFile;
}

export interface ProjectContext {
  files: Map<string, FileContext>;
  symbolTable: Map<string, CodeSymbol>;
  dependencyGraph: Map<string, string[]>;
  embeddings?: Map<string, number[]>;
  recentEdits: Array<{ file: string; timestamp: number; change: string }>;
}

export interface GenerationContext {
  currentFile?: string;
  cursorPosition?: number;
  selectedCode?: string;
  userIntent: string;
  projectContext: ProjectContext;
  relatedSymbols: CodeSymbol[];
  errorContext?: {
    type: string;
    message: string;
    line: number;
    column: number;
  };
}

/**
 * Context-Aware Code Generator
 * Implements advanced techniques from modern AI coding tools
 */
export class ContextAwareCodeGenerator {
  private projectContext: ProjectContext;

  constructor() {
    this.projectContext = {
      files: new Map(),
      symbolTable: new Map(),
      dependencyGraph: new Map(),
      recentEdits: []
    };
  }

  /**
   * 1. Index the Codebase - AST parsing and symbol extraction
   */
  async indexCodebase(projectPath: string): Promise<void> {
    console.log('[ContextAwareCodeGenerator] Indexing codebase...');
    
    const files = this.findTypeScriptFiles(projectPath);
    
    for (const filePath of files) {
      try {
        const fileContext = await this.parseFile(filePath);
        this.projectContext.files.set(filePath, fileContext);
        
        // Extract symbols and add to symbol table
        for (const symbol of fileContext.symbols) {
          this.projectContext.symbolTable.set(symbol.name, symbol);
        }
        
        // Build dependency graph
        this.projectContext.dependencyGraph.set(filePath, fileContext.dependencies);
        
      } catch (error) {
        console.error(`[ContextAwareCodeGenerator] Error parsing ${filePath}:`, error);
      }
    }
    
    console.log(`[ContextAwareCodeGenerator] Indexed ${this.projectContext.files.size} files with ${this.projectContext.symbolTable.size} symbols`);
  }

  /**
   * 2. Parse individual file with AST
   */
  private async parseFile(filePath: string): Promise<FileContext> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const symbols: CodeSymbol[] = [];
    const imports: string[] = [];
    const exports: string[] = [];
    const dependencies: string[] = [];

    // Extract symbols from AST
    this.extractSymbolsFromAST(sourceFile, symbols, imports, exports, dependencies);

    return {
      path: filePath,
      content,
      symbols,
      imports,
      exports,
      dependencies,
      ast: sourceFile
    };
  }

  /**
   * 3. Extract symbols from TypeScript AST
   */
  private extractSymbolsFromAST(
    sourceFile: ts.SourceFile,
    symbols: CodeSymbol[],
    imports: string[],
    exports: string[],
    dependencies: string[]
  ): void {
    const visit = (node: ts.Node) => {
      // Extract imports
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        imports.push(importPath);
        dependencies.push(importPath);
      }

      // Extract function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const symbol: CodeSymbol = {
          name: node.name.text,
          type: 'function',
          location: sourceFile.fileName,
          signature: this.getFunctionSignature(node),
          parameters: this.getFunctionParameters(node),
          returnType: this.getReturnType(node),
          visibility: 'public'
        };
        symbols.push(symbol);
      }

      // Extract class declarations
      if (ts.isClassDeclaration(node) && node.name) {
        const symbol: CodeSymbol = {
          name: node.name.text,
          type: 'class',
          location: sourceFile.fileName,
          signature: this.getClassSignature(node),
          visibility: 'public'
        };
        symbols.push(symbol);
        
        // Extract class methods
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodName = this.getPropertyName(member.name);
            const methodSymbol: CodeSymbol = {
              name: `${node.name!.text}.${methodName}`,
              type: 'function',
              location: sourceFile.fileName,
              signature: this.getMethodSignature(member),
              parameters: this.getFunctionParameters(member),
              returnType: this.getReturnType(member),
              visibility: this.getVisibility(member)
            };
            symbols.push(methodSymbol);
          }
        });
      }

      // Extract interface declarations
      if (ts.isInterfaceDeclaration(node)) {
        const symbol: CodeSymbol = {
          name: node.name.text,
          type: 'interface',
          location: sourceFile.fileName,
          signature: this.getInterfaceSignature(node)
        };
        symbols.push(symbol);
      }

      // Extract variable declarations
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(declaration => {
          if (declaration.name && ts.isIdentifier(declaration.name)) {
            const symbol: CodeSymbol = {
              name: declaration.name.text,
              type: 'variable',
              location: sourceFile.fileName,
              signature: this.getVariableSignature(declaration)
            };
            symbols.push(symbol);
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * 4. Get function signature from AST node
   */
  private getFunctionSignature(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
    const name = this.getPropertyName(node.name!);
    const params = node.parameters.map(p => `${p.name.getText()}: ${p.type ? p.type.getText() : 'any'}`).join(', ');
    const returnType = this.getReturnType(node);
    return `${name}(${params}): ${returnType}`;
  }

  /**
   * 5. Get function parameters
   */
  private getFunctionParameters(node: ts.FunctionDeclaration | ts.MethodDeclaration): Array<{ name: string; type: string; required: boolean }> {
    return node.parameters.map(p => ({
      name: p.name.getText(),
      type: p.type ? p.type.getText() : 'any',
      required: !p.questionToken
    }));
  }

  /**
   * 6. Get return type
   */
  private getReturnType(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
    return node.type ? node.type.getText() : 'void';
  }

  /**
   * 7. Get class signature
   */
  private getClassSignature(node: ts.ClassDeclaration): string {
    const name = node.name!.text;
    const methods = node.members.filter(m => ts.isMethodDeclaration(m)).length;
    const properties = node.members.filter(m => ts.isPropertyDeclaration(m)).length;
    return `class ${name} (${methods} methods, ${properties} properties)`;
  }

  /**
   * 8. Get interface signature
   */
  private getInterfaceSignature(node: ts.InterfaceDeclaration): string {
    const name = node.name.text;
    const members = node.members.length;
    return `interface ${name} (${members} members)`;
  }

  /**
   * 9. Get variable signature
   */
  private getVariableSignature(node: ts.VariableDeclaration): string {
    const name = node.name.getText();
    const type = node.type ? node.type.getText() : 'any';
    return `const ${name}: ${type}`;
  }

  /**
   * 10. Get method signature
   */
  private getMethodSignature(node: ts.MethodDeclaration): string {
    return this.getFunctionSignature(node);
  }

  /**
   * 11. Get property name
   */
  private getPropertyName(name: ts.PropertyName): string {
    if (ts.isIdentifier(name)) return name.text;
    if (ts.isStringLiteral(name)) return name.text;
    if (ts.isNumericLiteral(name)) return name.text;
    return 'unknown';
  }

  /**
   * 12. Get visibility modifier
   */
  private getVisibility(node: ts.MethodDeclaration): 'public' | 'private' | 'protected' {
    if (node.modifiers) {
      for (const modifier of node.modifiers) {
        if (modifier.kind === ts.SyntaxKind.PrivateKeyword) return 'private';
        if (modifier.kind === ts.SyntaxKind.ProtectedKeyword) return 'protected';
      }
    }
    return 'public';
  }

  /**
   * 13. Find TypeScript files recursively
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.findTypeScriptFiles(fullPath));
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * 14. Chunking the Context Intelligently - Find related symbols
   */
  findRelatedSymbols(context: GenerationContext): CodeSymbol[] {
    const related: CodeSymbol[] = [];
    
    // Find symbols in current file
    if (context.currentFile) {
      const fileContext = this.projectContext.files.get(context.currentFile);
      if (fileContext) {
        related.push(...fileContext.symbols);
      }
    }
    
    // Find symbols by name similarity
    const searchTerms = this.extractSearchTerms(context.userIntent);
    for (const [name, symbol] of this.projectContext.symbolTable) {
      if (searchTerms.some(term => name.toLowerCase().includes(term.toLowerCase()))) {
        related.push(symbol);
      }
    }
    
    // Find recently edited symbols
    const recentSymbols = this.getRecentlyEditedSymbols();
    related.push(...recentSymbols);
    
    return related.slice(0, 10); // Limit to top 10 related symbols
  }

  /**
   * 15. Extract search terms from user intent
   */
  private extractSearchTerms(userIntent: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const keywords = userIntent.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !['the', 'and', 'for', 'with', 'this', 'that'].includes(word));
    
    return keywords;
  }

  /**
   * 16. Get recently edited symbols
   */
  private getRecentlyEditedSymbols(): CodeSymbol[] {
    const recent: CodeSymbol[] = [];
    const recentFiles = this.projectContext.recentEdits
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(edit => edit.file);
    
    for (const file of recentFiles) {
      const fileContext = this.projectContext.files.get(file);
      if (fileContext) {
        recent.push(...fileContext.symbols);
      }
    }
    
    return recent;
  }

  /**
   * 17. Multi-stage Prompting - Generate code with context
   */
  async generateCodeWithContext(context: GenerationContext): Promise<string> {
    console.log('[ContextAwareCodeGenerator] Generating code with context...');
    
    // Stage 1: Understand intent and context
    const intent = await this.analyzeIntent(context);
    
    // Stage 2: Retrieve related code and types
    const relatedSymbols = this.findRelatedSymbols(context);
    
    // Stage 3: Generate raw code
    const generatedCode = await this.generateRawCode(context, intent, relatedSymbols);
    
    // Stage 4: Format and fix imports
    const formattedCode = await this.formatAndFixImports(generatedCode, context);
    
    // Stage 5: Validate and return
    const validatedCode = await this.validateCode(formattedCode, context);
    
    return validatedCode;
  }

  /**
   * 18. Stage 1: Analyze user intent
   */
  private async analyzeIntent(context: GenerationContext): Promise<any> {
    const prompt = `Analyze the user's intent for code generation:

User Intent: ${context.userIntent}
Current File: ${context.currentFile || 'None'}
Selected Code: ${context.selectedCode || 'None'}
Error Context: ${context.errorContext ? JSON.stringify(context.errorContext) : 'None'}

Extract the following information:
1. What type of code should be generated (function, class, method, etc.)
2. What is the main purpose or functionality
3. What are the expected inputs and outputs
4. What patterns or conventions should be followed
5. Any specific requirements or constraints

Return as JSON:`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.1
    });

    try {
      return JSON.parse(response.choices[0].message.content || '{}');
    } catch {
      return { type: 'function', purpose: 'unknown' };
    }
  }

  /**
   * 19. Stage 3: Generate raw code with context
   */
  private async generateRawCode(context: GenerationContext, intent: any, relatedSymbols: CodeSymbol[]): Promise<string> {
    const contextPrompt = this.buildContextPrompt(context, intent, relatedSymbols);
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: contextPrompt }],
      max_tokens: 2000,
      temperature: 0.2
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 20. Build comprehensive context prompt
   */
  private buildContextPrompt(context: GenerationContext, intent: any, relatedSymbols: CodeSymbol[]): string {
    let prompt = `You are a context-aware code generator. Generate code based on the current project context.

USER INTENT: ${context.userIntent}

CURRENT FILE: ${context.currentFile || 'None'}
SELECTED CODE: ${context.selectedCode || 'None'}

PROJECT CONTEXT:
- Total files: ${this.projectContext.files.size}
- Total symbols: ${this.projectContext.symbolTable.size}

RELATED SYMBOLS (${relatedSymbols.length}):
`;

    // Add related symbols context
    for (const symbol of relatedSymbols.slice(0, 5)) {
      prompt += `- ${symbol.name} (${symbol.type}) at ${symbol.location}\n`;
      if (symbol.signature) {
        prompt += `  Signature: ${symbol.signature}\n`;
      }
      if (symbol.description) {
        prompt += `  Description: ${symbol.description}\n`;
      }
      prompt += '\n';
    }

    // Add current file context if available
    if (context.currentFile) {
      const fileContext = this.projectContext.files.get(context.currentFile);
      if (fileContext) {
        prompt += `CURRENT FILE CONTEXT:\n`;
        prompt += `- Imports: ${fileContext.imports.join(', ')}\n`;
        prompt += `- Exports: ${fileContext.exports.join(', ')}\n`;
        prompt += `- Dependencies: ${fileContext.dependencies.join(', ')}\n\n`;
      }
    }

    // Add error context if available
    if (context.errorContext) {
      prompt += `ERROR CONTEXT:\n`;
      prompt += `- Type: ${context.errorContext.type}\n`;
      prompt += `- Message: ${context.errorContext.message}\n`;
      prompt += `- Location: Line ${context.errorContext.line}, Column ${context.errorContext.column}\n\n`;
    }

    prompt += `INTENT ANALYSIS: ${JSON.stringify(intent, null, 2)}\n\n`;

    prompt += `Generate TypeScript code that:
1. Matches the user's intent
2. Uses existing patterns and conventions from the project
3. Properly integrates with existing code
4. Follows TypeScript best practices
5. Includes proper error handling
6. Uses async/await where appropriate

Return ONLY the generated code, no explanations:`;

    return prompt;
  }

  /**
   * 21. Stage 4: Format and fix imports
   */
  private async formatAndFixImports(code: string, context: GenerationContext): Promise<string> {
    // Simple import fixing - could be enhanced with AST manipulation
    const imports = this.extractRequiredImports(code, context);
    
    if (imports.length > 0) {
      const importStatements = imports.map(imp => `import { ${imp} } from './${imp}';`).join('\n');
      return `${importStatements}\n\n${code}`;
    }
    
    return code;
  }

  /**
   * 22. Extract required imports from generated code
   */
  private extractRequiredImports(code: string, context: GenerationContext): string[] {
    const imports: string[] = [];
    
    // Simple pattern matching - could be enhanced with AST analysis
    const patterns = [
      /(\w+)Service/g,
      /(\w+)Controller/g,
      /(\w+)Repository/g,
      /(\w+)Validator/g
    ];
    
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        imports.push(...matches.map(m => m.replace(/Service|Controller|Repository|Validator/, '')));
      }
    }
    
    return [...new Set(imports)]; // Remove duplicates
  }

  /**
   * 23. Stage 5: Validate generated code
   */
  private async validateCode(code: string, context: GenerationContext): Promise<string> {
    // Basic validation - could be enhanced with TypeScript compiler
    const validationPrompt = `Validate this TypeScript code for syntax and common issues:

${code}

Check for:
1. Syntax errors
2. Missing imports
3. Type mismatches
4. Async/await usage
5. Error handling

If there are issues, fix them and return the corrected code. If it's valid, return the original code.`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: validationPrompt }],
      max_tokens: 2000,
      temperature: 0.1
    });

    return response.choices[0].message.content || code;
  }

  /**
   * 24. Update context with recent edits
   */
  updateContext(file: string, change: string): void {
    this.projectContext.recentEdits.push({
      file,
      timestamp: Date.now(),
      change
    });
    
    // Keep only recent edits (last 10)
    if (this.projectContext.recentEdits.length > 10) {
      this.projectContext.recentEdits = this.projectContext.recentEdits.slice(-10);
    }
  }

  /**
   * 25. Get symbol by name
   */
  getSymbol(name: string): CodeSymbol | undefined {
    return this.projectContext.symbolTable.get(name);
  }

  /**
   * 26. Get all symbols
   */
  getAllSymbols(): CodeSymbol[] {
    return Array.from(this.projectContext.symbolTable.values());
  }

  /**
   * 27. Get file context
   */
  getFileContext(filePath: string): FileContext | undefined {
    return this.projectContext.files.get(filePath);
  }
} 