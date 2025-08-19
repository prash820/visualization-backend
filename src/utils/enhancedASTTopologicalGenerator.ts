import * as ts from 'typescript';
import fs from 'fs/promises';
import path from 'path';
import { InfrastructureContext } from '../types/infrastructure';

// Enhanced AST-based topological ordering interfaces
export interface ASTNode {
  id: string;
  type: 'file' | 'class' | 'interface' | 'function' | 'variable' | 'import' | 'export';
  name: string;
  filePath: string;
  line: number;
  column: number;
  dependencies: string[];
  dependents: string[];
  complexity: number;
  infrastructureDependencies: InfrastructureDependency[];
  generationOrder: number;
  content?: string;
  signature?: string;
  parameters?: Array<{ name: string; type: string; required: boolean }>;
  returnType?: string;
  visibility?: 'public' | 'private' | 'protected';
}

export interface InfrastructureDependency {
  type: 'database' | 'api' | 'storage' | 'cache' | 'auth' | 'compute' | 'network';
  resource: string;
  endpoint?: string;
  configuration?: any;
  required: boolean;
}

export interface TopologicalGraph {
  nodes: Map<string, ASTNode>;
  edges: Map<string, Set<string>>;
  reverseEdges: Map<string, Set<string>>;
  sortedOrder: string[];
  cycles: string[][];
  infrastructureContext: InfrastructureContext;
}

export interface GenerationPlan {
  files: ASTNode[];
  infrastructureIntegration: InfrastructureIntegration[];
  buildOrder: string[];
  validationSteps: ValidationStep[];
}

export interface InfrastructureIntegration {
  filePath: string;
  integrationType: 'database' | 'api' | 'storage' | 'cache' | 'auth' | 'compute';
  configuration: any;
  environmentVariables: string[];
  dependencies: string[];
}

export interface ValidationStep {
  step: string;
  command: string;
  expectedOutput: string;
  errorHandling: 'continue' | 'fail' | 'retry';
}

/**
 * Enhanced AST-based Topological Generator
 * Integrates infrastructure analysis with dependency-aware code generation
 */
export class EnhancedASTTopologicalGenerator {
  private graph: TopologicalGraph;
  private infrastructureContext: InfrastructureContext;
  private projectPath: string;

  constructor(projectPath: string, infrastructureContext: InfrastructureContext) {
    this.projectPath = projectPath;
    this.infrastructureContext = infrastructureContext;
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      reverseEdges: new Map(),
      sortedOrder: [],
      cycles: [],
      infrastructureContext
    };
  }

  /**
   * Main entry point: Generate code with AST-based topological ordering
   */
  async generateCodeWithASTTopology(umlDiagrams: any): Promise<GenerationPlan> {
    console.log('[EnhancedASTTopologicalGenerator] Starting AST-based topological generation...');
    
    try {
      // Step 1: Parse UML diagrams and extract AST nodes
      const astNodes = await this.parseUMLDiagramsToAST(umlDiagrams);
      
      // Step 2: Build dependency graph with infrastructure context
      await this.buildDependencyGraphWithInfrastructure(astNodes);
      
      // Step 3: Perform topological sort with infrastructure awareness
      this.performInfrastructureAwareTopologicalSort();
      
      // Step 4: Generate infrastructure integration plan
      const infrastructureIntegration = this.generateInfrastructureIntegrationPlan();
      
      // Step 5: Create validation steps
      const validationSteps = this.createValidationSteps();
      
      // Step 6: Build final generation plan
      const generationPlan: GenerationPlan = {
        files: Array.from(this.graph.nodes.values()).sort((a, b) => a.generationOrder - b.generationOrder),
        infrastructureIntegration,
        buildOrder: this.graph.sortedOrder,
        validationSteps
      };
      
      console.log(`[EnhancedASTTopologicalGenerator] Generated plan with ${generationPlan.files.length} files, ${generationPlan.infrastructureIntegration.length} integrations`);
      return generationPlan;
      
    } catch (error: any) {
      console.error('[EnhancedASTTopologicalGenerator] Error in AST-based generation:', error);
      throw error;
    }
  }

  /**
   * Parse UML diagrams and convert to AST nodes
   */
  private async parseUMLDiagramsToAST(umlDiagrams: any): Promise<ASTNode[]> {
    console.log('[EnhancedASTTopologicalGenerator] Parsing UML diagrams to AST nodes...');
    
    const astNodes: ASTNode[] = [];
    
    // Parse class diagram
    if (umlDiagrams.backendClass) {
      const classNodes = this.parseClassDiagramToAST(umlDiagrams.backendClass);
      astNodes.push(...classNodes);
    }
    
    // Parse sequence diagram
    if (umlDiagrams.backendSequence) {
      const sequenceNodes = this.parseSequenceDiagramToAST(umlDiagrams.backendSequence);
      astNodes.push(...sequenceNodes);
    }
    
    // Parse component diagram
    if (umlDiagrams.backendComponent) {
      const componentNodes = this.parseComponentDiagramToAST(umlDiagrams.backendComponent);
      astNodes.push(...componentNodes);
    }
    
    // Add infrastructure-aware nodes
    const infrastructureNodes = this.createInfrastructureAwareNodes();
    astNodes.push(...infrastructureNodes);
    
    console.log(`[EnhancedASTTopologicalGenerator] Created ${astNodes.length} AST nodes from UML diagrams`);
    return astNodes;
  }

  /**
   * Parse class diagram to AST nodes
   */
  private parseClassDiagramToAST(classDiagram: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Extract classes from class diagram
    const classMatches = classDiagram.match(/class\s+(\w+)\s*\{/g);
    if (classMatches) {
      classMatches.forEach((match, index) => {
        const className = match.match(/class\s+(\w+)/)?.[1];
        if (className) {
          const node: ASTNode = {
            id: `class_${className}`,
            type: 'class',
            name: className,
            filePath: `src/models/${className}.ts`,
            line: 1,
            column: 1,
            dependencies: [],
            dependents: [],
            complexity: 1,
            infrastructureDependencies: this.analyzeInfrastructureDependencies(className),
            generationOrder: -1,
            signature: `class ${className}`,
            visibility: 'public'
          };
          nodes.push(node);
        }
      });
    }
    
    // Extract interfaces
    const interfaceMatches = classDiagram.match(/interface\s+(\w+)\s*\{/g);
    if (interfaceMatches) {
      interfaceMatches.forEach((match, index) => {
        const interfaceName = match.match(/interface\s+(\w+)/)?.[1];
        if (interfaceName) {
          const node: ASTNode = {
            id: `interface_${interfaceName}`,
            type: 'interface',
            name: interfaceName,
            filePath: `src/types/${interfaceName}.ts`,
            line: 1,
            column: 1,
            dependencies: [],
            dependents: [],
            complexity: 1,
            infrastructureDependencies: [],
            generationOrder: -1,
            signature: `interface ${interfaceName}`,
            visibility: 'public'
          };
          nodes.push(node);
        }
      });
    }
    
    return nodes;
  }

  /**
   * Parse sequence diagram to AST nodes
   */
  private parseSequenceDiagramToAST(sequenceDiagram: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Extract participants (services/controllers)
    const participantMatches = sequenceDiagram.match(/participant\s+(\w+)/g);
    if (participantMatches) {
      participantMatches.forEach((match, index) => {
        const participantName = match.match(/participant\s+(\w+)/)?.[1];
        if (participantName) {
          const node: ASTNode = {
            id: `service_${participantName}`,
            type: 'class',
            name: participantName,
            filePath: `src/services/${participantName}Service.ts`,
            line: 1,
            column: 1,
            dependencies: [],
            dependents: [],
            complexity: 2,
            infrastructureDependencies: this.analyzeInfrastructureDependencies(participantName),
            generationOrder: -1,
            signature: `class ${participantName}Service`,
            visibility: 'public'
          };
          nodes.push(node);
        }
      });
    }
    
    return nodes;
  }

  /**
   * Parse component diagram to AST nodes
   */
  private parseComponentDiagramToAST(componentDiagram: string): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Extract components
    const componentMatches = componentDiagram.match(/component\s+(\w+)/g);
    if (componentMatches) {
      componentMatches.forEach((match, index) => {
        const componentName = match.match(/component\s+(\w+)/)?.[1];
        if (componentName) {
          const node: ASTNode = {
            id: `component_${componentName}`,
            type: 'class',
            name: componentName,
            filePath: `src/components/${componentName}.ts`,
            line: 1,
            column: 1,
            dependencies: [],
            dependents: [],
            complexity: 2,
            infrastructureDependencies: this.analyzeInfrastructureDependencies(componentName),
            generationOrder: -1,
            signature: `class ${componentName}`,
            visibility: 'public'
          };
          nodes.push(node);
        }
      });
    }
    
    return nodes;
  }

  /**
   * Create infrastructure-aware nodes based on Terraform state
   */
  private createInfrastructureAwareNodes(): ASTNode[] {
    const nodes: ASTNode[] = [];
    
    // Database configuration node
    if (this.infrastructureContext.databaseUrl) {
      const dbNode: ASTNode = {
        id: 'infrastructure_database',
        type: 'class',
        name: 'DatabaseConfig',
        filePath: 'src/config/database.ts',
        line: 1,
        column: 1,
        dependencies: [],
        dependents: [],
        complexity: 1,
        infrastructureDependencies: [{
          type: 'database',
          resource: 'database',
          endpoint: this.infrastructureContext.databaseUrl,
          configuration: {
            url: this.infrastructureContext.databaseUrl,
            name: this.infrastructureContext.databaseName,
            type: this.infrastructureContext.databaseType
          },
          required: true
        }],
        generationOrder: -1,
        signature: 'class DatabaseConfig',
        visibility: 'public'
      };
      nodes.push(dbNode);
    }
    
    // API Gateway configuration node
    if (this.infrastructureContext.apiGatewayUrl) {
      const apiNode: ASTNode = {
        id: 'infrastructure_api',
        type: 'class',
        name: 'APIConfig',
        filePath: 'src/config/api.ts',
        line: 1,
        column: 1,
        dependencies: [],
        dependents: [],
        complexity: 1,
        infrastructureDependencies: [{
          type: 'api',
          resource: 'api_gateway',
          endpoint: this.infrastructureContext.apiGatewayUrl,
          configuration: {
            url: this.infrastructureContext.apiGatewayUrl,
            id: this.infrastructureContext.apiGatewayId,
            stage: this.infrastructureContext.apiGatewayStage
          },
          required: true
        }],
        generationOrder: -1,
        signature: 'class APIConfig',
        visibility: 'public'
      };
      nodes.push(apiNode);
    }
    
    // Lambda functions configuration node
    if (this.infrastructureContext.lambdaFunctions && Object.keys(this.infrastructureContext.lambdaFunctions).length > 0) {
      const lambdaNode: ASTNode = {
        id: 'infrastructure_lambda',
        type: 'class',
        name: 'LambdaConfig',
        filePath: 'src/config/lambda.ts',
        line: 1,
        column: 1,
        dependencies: [],
        dependents: [],
        complexity: 2,
        infrastructureDependencies: [{
          type: 'compute',
          resource: 'lambda',
          configuration: this.infrastructureContext.lambdaFunctions,
          required: true
        }],
        generationOrder: -1,
        signature: 'class LambdaConfig',
        visibility: 'public'
      };
      nodes.push(lambdaNode);
    }
    
    return nodes;
  }

  /**
   * Analyze infrastructure dependencies for a component
   */
  private analyzeInfrastructureDependencies(componentName: string): InfrastructureDependency[] {
    const dependencies: InfrastructureDependency[] = [];
    
    // Check if component needs database
    if (componentName.toLowerCase().includes('model') || 
        componentName.toLowerCase().includes('entity') ||
        componentName.toLowerCase().includes('repository')) {
      if (this.infrastructureContext.databaseUrl) {
        dependencies.push({
          type: 'database',
          resource: 'database',
          endpoint: this.infrastructureContext.databaseUrl,
          configuration: {
            url: this.infrastructureContext.databaseUrl,
            name: this.infrastructureContext.databaseName,
            type: this.infrastructureContext.databaseType
          },
          required: true
        });
      }
    }
    
    // Check if component needs API
    if (componentName.toLowerCase().includes('service') || 
        componentName.toLowerCase().includes('controller') ||
        componentName.toLowerCase().includes('api')) {
      if (this.infrastructureContext.apiGatewayUrl) {
        dependencies.push({
          type: 'api',
          resource: 'api_gateway',
          endpoint: this.infrastructureContext.apiGatewayUrl,
          configuration: {
            url: this.infrastructureContext.apiGatewayUrl,
            id: this.infrastructureContext.apiGatewayId,
            stage: this.infrastructureContext.apiGatewayStage
          },
          required: true
        });
      }
    }
    
    // Check if component needs storage
    if (componentName.toLowerCase().includes('storage') || 
        componentName.toLowerCase().includes('file') ||
        componentName.toLowerCase().includes('upload')) {
      if (this.infrastructureContext.s3BucketName) {
        dependencies.push({
          type: 'storage',
          resource: 's3',
          configuration: {
            bucket: this.infrastructureContext.s3BucketName,
            region: this.infrastructureContext.s3BucketRegion
          },
          required: true
        });
      }
    }
    
    return dependencies;
  }

  /**
   * Build dependency graph with infrastructure context
   */
  private async buildDependencyGraphWithInfrastructure(astNodes: ASTNode[]): Promise<void> {
    console.log('[EnhancedASTTopologicalGenerator] Building dependency graph with infrastructure context...');
    
    // Initialize graph nodes
    for (const node of astNodes) {
      this.graph.nodes.set(node.id, node);
      this.graph.edges.set(node.id, new Set());
      this.graph.reverseEdges.set(node.id, new Set());
    }
    
    // Build dependency relationships
    for (const node of astNodes) {
      // Add infrastructure dependencies
      for (const infraDep of node.infrastructureDependencies) {
        const infraNodeId = `infrastructure_${infraDep.type}`;
        const infraNode = this.graph.nodes.get(infraNodeId);
        
        if (infraNode) {
          // Node depends on infrastructure
          this.graph.edges.get(node.id)!.add(infraNodeId);
          this.graph.reverseEdges.get(infraNodeId)!.add(node.id);
          
          // Update node dependencies
          node.dependencies.push(infraNodeId);
          infraNode.dependents.push(node.id);
        }
      }
      
      // Add file-based dependencies
      for (const otherNode of astNodes) {
        if (node.id !== otherNode.id) {
          // Check if this node depends on the other node
          if (this.hasDependency(node, otherNode)) {
            this.graph.edges.get(node.id)!.add(otherNode.id);
            this.graph.reverseEdges.get(otherNode.id)!.add(node.id);
            
            node.dependencies.push(otherNode.id);
            otherNode.dependents.push(node.id);
          }
        }
      }
    }
    
    console.log(`[EnhancedASTTopologicalGenerator] Built dependency graph with ${this.graph.nodes.size} nodes`);
  }

  /**
   * Check if one node depends on another
   */
  private hasDependency(node: ASTNode, otherNode: ASTNode): boolean {
    // Check file path dependencies
    if (node.filePath.includes('services') && otherNode.filePath.includes('models')) {
      return true; // Services depend on models
    }
    
    if (node.filePath.includes('controllers') && otherNode.filePath.includes('services')) {
      return true; // Controllers depend on services
    }
    
    if (node.filePath.includes('routes') && otherNode.filePath.includes('controllers')) {
      return true; // Routes depend on controllers
    }
    
    // Check name-based dependencies
    if (node.name.toLowerCase().includes('service') && otherNode.name.toLowerCase().includes('model')) {
      return true;
    }
    
    if (node.name.toLowerCase().includes('controller') && otherNode.name.toLowerCase().includes('service')) {
      return true;
    }
    
    return false;
  }

  /**
   * Perform infrastructure-aware topological sort
   */
  private performInfrastructureAwareTopologicalSort(): void {
    console.log('[EnhancedASTTopologicalGenerator] Performing infrastructure-aware topological sort...');
    
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: string[] = [];
    const cycles: string[][] = [];
    
    const visit = (nodeId: string, path: string[] = []): boolean => {
      if (tempVisited.has(nodeId)) {
        // Circular dependency detected
        const cycle = [...path, nodeId];
        cycles.push(cycle);
        console.warn(`[EnhancedASTTopologicalGenerator] Circular dependency detected: ${cycle.join(' -> ')}`);
        return false;
      }
      
      if (visited.has(nodeId)) {
        return true;
      }
      
      tempVisited.add(nodeId);
      
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        // Visit infrastructure dependencies first
        const infrastructureDeps = node.dependencies.filter(dep => dep.startsWith('infrastructure_'));
        const otherDeps = node.dependencies.filter(dep => !dep.startsWith('infrastructure_'));
        
        // Visit infrastructure dependencies first
        for (const dep of infrastructureDeps) {
          if (!visit(dep, [...path, nodeId])) {
            return false;
          }
        }
        
        // Then visit other dependencies
        for (const dep of otherDeps) {
          if (!visit(dep, [...path, nodeId])) {
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
    for (const [nodeId] of this.graph.nodes) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    // Assign generation order
    sorted.forEach((nodeId, index) => {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        node.generationOrder = index;
      }
    });
    
    this.graph.sortedOrder = sorted;
    this.graph.cycles = cycles;
    
    console.log(`[EnhancedASTTopologicalGenerator] Topological sort complete - ${sorted.length} nodes, ${cycles.length} cycles`);
    console.log(`[EnhancedASTTopologicalGenerator] Generation order: ${sorted.join(' -> ')}`);
  }

  /**
   * Generate infrastructure integration plan
   */
  private generateInfrastructureIntegrationPlan(): InfrastructureIntegration[] {
    console.log('[EnhancedASTTopologicalGenerator] Generating infrastructure integration plan...');
    
    const integrations: InfrastructureIntegration[] = [];
    
    // Database integration
    if (this.infrastructureContext.databaseUrl) {
      integrations.push({
        filePath: 'src/config/database.ts',
        integrationType: 'database',
        configuration: {
          url: this.infrastructureContext.databaseUrl,
          name: this.infrastructureContext.databaseName,
          type: this.infrastructureContext.databaseType,
          port: this.infrastructureContext.databasePort
        },
        environmentVariables: [
          'DATABASE_URL',
          'DATABASE_NAME',
          'DATABASE_TYPE'
        ],
        dependencies: []
      });
    }
    
    // API Gateway integration
    if (this.infrastructureContext.apiGatewayUrl) {
      integrations.push({
        filePath: 'src/config/api.ts',
        integrationType: 'api',
        configuration: {
          url: this.infrastructureContext.apiGatewayUrl,
          id: this.infrastructureContext.apiGatewayId,
          stage: this.infrastructureContext.apiGatewayStage
        },
        environmentVariables: [
          'API_GATEWAY_URL',
          'API_GATEWAY_ID',
          'API_GATEWAY_STAGE'
        ],
        dependencies: []
      });
    }
    
    // Lambda integration
    if (this.infrastructureContext.lambdaFunctions && Object.keys(this.infrastructureContext.lambdaFunctions).length > 0) {
      integrations.push({
        filePath: 'src/config/lambda.ts',
        integrationType: 'compute',
        configuration: this.infrastructureContext.lambdaFunctions,
        environmentVariables: [
          'LAMBDA_FUNCTION_URL',
          'LAMBDA_FUNCTION_ARN'
        ],
        dependencies: []
      });
    }
    
    // S3 integration
    if (this.infrastructureContext.s3BucketName) {
      integrations.push({
        filePath: 'src/config/storage.ts',
        integrationType: 'storage',
        configuration: {
          bucket: this.infrastructureContext.s3BucketName,
          region: this.infrastructureContext.s3BucketRegion
        },
        environmentVariables: [
          'S3_BUCKET_NAME',
          'S3_BUCKET_REGION'
        ],
        dependencies: []
      });
    }
    
    console.log(`[EnhancedASTTopologicalGenerator] Generated ${integrations.length} infrastructure integrations`);
    return integrations;
  }

  /**
   * Create validation steps
   */
  private createValidationSteps(): ValidationStep[] {
    console.log('[EnhancedASTTopologicalGenerator] Creating validation steps...');
    
    const steps: ValidationStep[] = [
      {
        step: 'TypeScript Compilation',
        command: 'npx tsc --noEmit',
        expectedOutput: 'Found 0 errors',
        errorHandling: 'fail'
      },
      {
        step: 'ESLint Check',
        command: 'npx eslint . --ext .ts,.tsx',
        expectedOutput: 'All files pass linting',
        errorHandling: 'continue'
      },
      {
        step: 'Infrastructure Connection Test',
        command: 'npm run test:infrastructure',
        expectedOutput: 'All infrastructure connections successful',
        errorHandling: 'retry'
      },
      {
        step: 'Build Verification',
        command: 'npm run build',
        expectedOutput: 'Build completed successfully',
        errorHandling: 'fail'
      }
    ];
    
    console.log(`[EnhancedASTTopologicalGenerator] Created ${steps.length} validation steps`);
    return steps;
  }

  /**
   * Get generation statistics
   */
  getGenerationStats(): {
    totalNodes: number;
    infrastructureNodes: number;
    dependencyLevels: number;
    cycles: number;
    averageComplexity: number;
  } {
    const nodes = Array.from(this.graph.nodes.values());
    const infrastructureNodes = nodes.filter(n => n.id.startsWith('infrastructure_')).length;
    const maxDependencyLevel = Math.max(...nodes.map(n => n.dependencies.length));
    const averageComplexity = nodes.reduce((sum, n) => sum + n.complexity, 0) / nodes.length;
    
    return {
      totalNodes: nodes.length,
      infrastructureNodes,
      dependencyLevels: maxDependencyLevel,
      cycles: this.graph.cycles.length,
      averageComplexity
    };
  }
} 