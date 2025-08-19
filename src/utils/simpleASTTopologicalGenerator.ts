import * as ts from 'typescript';
import { InfrastructureContext } from '../types/infrastructure';

// Simplified interfaces for topological ordering and function signatures
export interface ASTNode {
  id: string;
  name: string;
  type: 'class' | 'interface' | 'service' | 'controller' | 'model';
  filePath: string;
  dependencies: string[];
  dependents: string[];
  generationOrder: number;
  methods: FunctionSignature[];
  properties: PropertySignature[];
}

export interface FunctionSignature {
  name: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  description?: string;
}

export interface PropertySignature {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  required: boolean;
  description?: string;
}

export interface TopologicalResult {
  nodes: ASTNode[];
  generationOrder: string[];
  functionSignatures: Map<string, FunctionSignature[]>;
  cycles: string[][];
}

/**
 * Simple AST-based Topological Generator
 * Focuses only on topological ordering and function signature generation
 */
export class SimpleASTTopologicalGenerator {
  private nodes: Map<string, ASTNode> = new Map();
  private infrastructureContext: InfrastructureContext;

  constructor(infrastructureContext: InfrastructureContext) {
    this.infrastructureContext = infrastructureContext;
  }

  /**
   * Main entry point: Generate topological order and function signatures
   */
  async generateTopologyAndSignatures(umlDiagrams: any): Promise<TopologicalResult> {
    console.log('[SimpleASTTopologicalGenerator] Starting topology and signature generation...');
    
    try {
      // Step 1: Parse class diagram to extract classes and methods
      const astNodes = this.parseClassDiagramToAST(umlDiagrams.backendClass || '');
      
      // Step 2: Build dependency graph
      this.buildDependencyGraph(astNodes);
      
      // Step 3: Perform topological sort
      const generationOrder = this.performTopologicalSort();
      
      // Step 4: Generate function signatures map
      const functionSignatures = this.generateFunctionSignaturesMap();
      
      console.log(`[SimpleASTTopologicalGenerator] Generated topology with ${astNodes.length} nodes, ${generationOrder.length} in order`);
      
      return {
        nodes: astNodes,
        generationOrder,
        functionSignatures,
        cycles: this.detectCycles()
      };
      
    } catch (error: any) {
      console.error('[SimpleASTTopologicalGenerator] Error in topology generation:', error);
      throw error;
    }
  }

  /**
   * Parse class diagram to extract AST nodes with methods
   */
  private parseClassDiagramToAST(classDiagram: string): ASTNode[] {
    console.log('[SimpleASTTopologicalGenerator] Parsing class diagram...');
    
    const nodes: ASTNode[] = [];
    const lines = classDiagram.split('\n');
    
    let currentClass: ASTNode | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect class declaration
      const classMatch = trimmedLine.match(/class\s+(\w+)/);
      if (classMatch) {
        const className = classMatch[1];
        const filePath = this.determineFilePath(className);
        
        currentClass = {
          id: `class_${className}`,
          name: className,
          type: this.determineType(className),
          filePath,
          dependencies: [],
          dependents: [],
          generationOrder: -1,
          methods: [],
          properties: []
        };
        
        nodes.push(currentClass);
        this.nodes.set(currentClass.id, currentClass);
        continue;
      }
      
      // Detect interface declaration
      const interfaceMatch = trimmedLine.match(/interface\s+(\w+)/);
      if (interfaceMatch) {
        const interfaceName = interfaceMatch[1];
        const filePath = `src/types/${interfaceName}.ts`;
        
        currentClass = {
          id: `interface_${interfaceName}`,
          name: interfaceName,
          type: 'interface',
          filePath,
          dependencies: [],
          dependents: [],
          generationOrder: -1,
          methods: [],
          properties: []
        };
        
        nodes.push(currentClass);
        this.nodes.set(currentClass.id, currentClass);
        continue;
      }
      
      // Detect method declarations
      if (currentClass && trimmedLine.includes('(') && trimmedLine.includes(')')) {
        const methodSignature = this.parseMethodSignature(trimmedLine);
        if (methodSignature) {
          currentClass.methods.push(methodSignature);
        }
      }
      
      // Detect property declarations
      if (currentClass && trimmedLine.includes(':') && !trimmedLine.includes('(')) {
        const propertySignature = this.parsePropertySignature(trimmedLine);
        if (propertySignature) {
          currentClass.properties.push(propertySignature);
        }
      }
      
      // Detect dependencies (imports or usage)
      if (currentClass && (trimmedLine.includes('import') || trimmedLine.includes('extends') || trimmedLine.includes('implements'))) {
        const dependencies = this.extractDependencies(trimmedLine);
        currentClass.dependencies.push(...dependencies);
      }
    }
    
    console.log(`[SimpleASTTopologicalGenerator] Parsed ${nodes.length} classes/interfaces with methods`);
    return nodes;
  }

  /**
   * Determine file path based on class name and type
   */
  private determineFilePath(className: string): string {
    const lowerClassName = className.toLowerCase();
    
    if (lowerClassName.includes('service')) {
      return `src/services/${className}Service.ts`;
    } else if (lowerClassName.includes('controller')) {
      return `src/controllers/${className}Controller.ts`;
    } else if (lowerClassName.includes('model') || lowerClassName.includes('entity')) {
      return `src/models/${className}.ts`;
    } else if (lowerClassName.includes('repository')) {
      return `src/repositories/${className}Repository.ts`;
    } else {
      return `src/models/${className}.ts`;
    }
  }

  /**
   * Determine type based on class name
   */
  private determineType(className: string): 'class' | 'interface' | 'service' | 'controller' | 'model' {
    const lowerClassName = className.toLowerCase();
    
    if (lowerClassName.includes('service')) {
      return 'service';
    } else if (lowerClassName.includes('controller')) {
      return 'controller';
    } else if (lowerClassName.includes('model') || lowerClassName.includes('entity')) {
      return 'model';
    } else {
      return 'class';
    }
  }

  /**
   * Parse method signature from UML line
   */
  private parseMethodSignature(line: string): FunctionSignature | null {
    // Match patterns like: +getUser(id: string): User
    const methodMatch = line.match(/([+\-~#])\s*(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/);
    if (methodMatch) {
      const [, visibility, methodName, params, returnType] = methodMatch;
      
      const parameters = this.parseParameters(params);
      const visibilityType = this.mapVisibility(visibility);
      
      return {
        name: methodName,
        parameters,
        returnType,
        visibility: visibilityType
      };
    }
    
    // Match patterns like: getUser(id: string): User
    const simpleMethodMatch = line.match(/(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/);
    if (simpleMethodMatch) {
      const [, methodName, params, returnType] = simpleMethodMatch;
      
      const parameters = this.parseParameters(params);
      
      return {
        name: methodName,
        parameters,
        returnType,
        visibility: 'public'
      };
    }
    
    return null;
  }

  /**
   * Parse property signature from UML line
   */
  private parsePropertySignature(line: string): PropertySignature | null {
    // Match patterns like: +id: string
    const propertyMatch = line.match(/([+\-~#])\s*(\w+)\s*:\s*(\w+)/);
    if (propertyMatch) {
      const [, visibility, propertyName, propertyType] = propertyMatch;
      
      return {
        name: propertyName,
        type: propertyType,
        visibility: this.mapVisibility(visibility),
        required: true
      };
    }
    
    // Match patterns like: id: string
    const simplePropertyMatch = line.match(/(\w+)\s*:\s*(\w+)/);
    if (simplePropertyMatch) {
      const [, propertyName, propertyType] = simplePropertyMatch;
      
      return {
        name: propertyName,
        type: propertyType,
        visibility: 'public',
        required: true
      };
    }
    
    return null;
  }

  /**
   * Parse method parameters
   */
  private parseParameters(paramsString: string): Array<{ name: string; type: string; required: boolean }> {
    if (!paramsString.trim()) {
      return [];
    }
    
    return paramsString.split(',').map(param => {
      const trimmed = param.trim();
      const [name, type] = trimmed.split(':').map(s => s.trim());
      
      return {
        name: name || 'param',
        type: type || 'any',
        required: true
      };
    });
  }

  /**
   * Map UML visibility to TypeScript visibility
   */
  private mapVisibility(umlVisibility: string): 'public' | 'private' | 'protected' {
    switch (umlVisibility) {
      case '+': return 'public';
      case '-': return 'private';
      case '#': return 'protected';
      case '~': return 'public'; // Map package to public for TypeScript
      default: return 'public';
    }
  }

  /**
   * Extract dependencies from UML line
   */
  private extractDependencies(line: string): string[] {
    const dependencies: string[] = [];
    
    // Extract class names that might be dependencies
    const classMatches = line.match(/\b[A-Z][a-zA-Z]*\b/g);
    if (classMatches) {
      for (const match of classMatches) {
        // Skip common keywords
        if (!['class', 'interface', 'extends', 'implements', 'import', 'from'].includes(match.toLowerCase())) {
          dependencies.push(match);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Build dependency graph between nodes
   */
  private buildDependencyGraph(nodes: ASTNode[]): void {
    console.log('[SimpleASTTopologicalGenerator] Building dependency graph...');
    
    for (const node of nodes) {
      for (const dependency of node.dependencies) {
        // Find the dependent node
        const dependentNode = nodes.find(n => n.name === dependency);
        if (dependentNode) {
          // Node depends on dependentNode
          node.dependencies.push(dependentNode.id);
          dependentNode.dependents.push(node.id);
        }
      }
    }
    
    console.log(`[SimpleASTTopologicalGenerator] Built dependency graph with ${nodes.length} nodes`);
  }

  /**
   * Perform topological sort to determine generation order
   */
  private performTopologicalSort(): string[] {
    console.log('[SimpleASTTopologicalGenerator] Performing topological sort...');
    
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: string[] = [];
    
    const visit = (nodeId: string): boolean => {
      if (tempVisited.has(nodeId)) {
        // Circular dependency detected
        console.warn(`[SimpleASTTopologicalGenerator] Circular dependency detected for ${nodeId}`);
        return false;
      }
      
      if (visited.has(nodeId)) {
        return true;
      }
      
      tempVisited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (node) {
        // Visit all dependencies first
        for (const dep of node.dependencies) {
          if (!visit(dep)) {
            return false;
          }
        }
      }
      
      tempVisited.delete(nodeId);
      visited.add(nodeId);
      sorted.push(nodeId);
      
      return true;
    };
    
    // Visit all nodes
    for (const [nodeId] of this.nodes) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    // Assign generation order
    sorted.forEach((nodeId, index) => {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.generationOrder = index;
      }
    });
    
    console.log(`[SimpleASTTopologicalGenerator] Topological sort complete: ${sorted.join(' → ')}`);
    return sorted;
  }

  /**
   * Generate function signatures map for dependency awareness
   */
  private generateFunctionSignaturesMap(): Map<string, FunctionSignature[]> {
    console.log('[SimpleASTTopologicalGenerator] Generating function signatures map...');
    
    const functionSignatures = new Map<string, FunctionSignature[]>();
    
    for (const [nodeId, node] of this.nodes) {
      functionSignatures.set(nodeId, node.methods);
    }
    
    console.log(`[SimpleASTTopologicalGenerator] Generated function signatures for ${functionSignatures.size} classes`);
    return functionSignatures;
  }

  /**
   * Detect cycles in dependency graph
   */
  private detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const dfs = (nodeId: string, path: string[] = []): boolean => {
      if (recStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return true;
      }
      
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (node) {
        for (const dep of node.dependencies) {
          dfs(dep, [...path]);
        }
      }
      
      recStack.delete(nodeId);
      return false;
    };
    
    for (const [nodeId] of this.nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }
    
    return cycles;
  }

  /**
   * Get generation statistics
   */
  getGenerationStats(): {
    totalNodes: number;
    totalMethods: number;
    totalProperties: number;
    cycles: number;
    averageMethodsPerClass: number;
  } {
    const nodes = Array.from(this.nodes.values());
    const totalMethods = nodes.reduce((sum, node) => sum + node.methods.length, 0);
    const totalProperties = nodes.reduce((sum, node) => sum + node.properties.length, 0);
    const cycles = this.detectCycles().length;
    const averageMethodsPerClass = nodes.length > 0 ? totalMethods / nodes.length : 0;
    
    return {
      totalNodes: nodes.length,
      totalMethods,
      totalProperties,
      cycles,
      averageMethodsPerClass
    };
  }
} 