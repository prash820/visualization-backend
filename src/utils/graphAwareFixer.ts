import * as fs from 'fs';
import * as path from 'path';
import { ComponentLevelFixer, ComponentMetadata, ComponentError } from './componentLevelFixer';

// Graph-Aware Dependency Fixing (Layer 2)
export class GraphAwareFixer {
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private reverseDependencyGraph: Map<string, Set<string>> = new Map();
  private componentFixer: ComponentLevelFixer;
  private errorMemory: Map<string, ComponentError[]> = new Map();
  private fixHistory: FixHistory[] = [];

  constructor(
    private projectPath: string, 
    private appType: string, 
    private framework: string
  ) {
    this.componentFixer = new ComponentLevelFixer(projectPath, appType, framework);
  }

  /**
   * Build dependency graph from component metadata
   */
  buildDependencyGraph(components: ComponentMetadata[]): void {
    console.log(`[GraphFixer] Building dependency graph for ${components.length} components...`);
    
    // Initialize graphs
    this.dependencyGraph.clear();
    this.reverseDependencyGraph.clear();
    
    // Register all components
    for (const component of components) {
      this.componentFixer.registerComponent(component);
      this.dependencyGraph.set(component.name, new Set());
      this.reverseDependencyGraph.set(component.name, new Set());
    }
    
    // Build dependency relationships
    for (const component of components) {
      for (const dependency of component.dependencies) {
        // component depends on dependency
        this.dependencyGraph.get(component.name)?.add(dependency);
        this.reverseDependencyGraph.get(dependency)?.add(component.name);
      }
    }
    
    console.log(`[GraphFixer] Dependency graph built with ${this.dependencyGraph.size} nodes`);
    this.logDependencyGraph();
  }

  /**
   * Get topological sort (leaves to root)
   */
  getTopologicalSort(): string[] {
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: string[] = [];
    const cycles: string[][] = [];
    
    const visit = (node: string, path: string[] = []): boolean => {
      if (tempVisited.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return false;
      }
      
      if (visited.has(node)) {
        return true;
      }
      
      tempVisited.add(node);
      path.push(node);
      
      // Visit all dependencies first
      const dependencies = this.dependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        if (!visit(dep, [...path])) {
          return false;
        }
      }
      
      tempVisited.delete(node);
      visited.add(node);
      sorted.push(node);
      
      return true;
    };
    
    // Visit all nodes
    for (const node of this.dependencyGraph.keys()) {
      if (!visited.has(node)) {
        if (!visit(node)) {
          console.warn(`[GraphFixer] Circular dependency detected for ${node}`);
        }
      }
    }
    
    // Break cycles if found
    if (cycles.length > 0) {
      console.warn(`[GraphFixer] Breaking ${cycles.length} circular dependencies`);
      for (const cycle of cycles) {
        // Remove the last dependency in the cycle
        const lastNode = cycle[cycle.length - 1];
        const firstNode = cycle[0];
        this.dependencyGraph.get(lastNode)?.delete(firstNode);
        this.reverseDependencyGraph.get(firstNode)?.delete(lastNode);
      }
      
      // Re-sort after breaking cycles
      return this.getTopologicalSort();
    }
    
    console.log(`[GraphFixer] Topological sort: ${sorted.join(' → ')}`);
    return sorted;
  }

  /**
   * Fix errors using graph-aware approach (leaves to root)
   */
  async fixErrorsGraphAware(): Promise<GraphFixResult> {
    console.log(`[GraphFixer] Starting graph-aware error fixing...`);
    
    const sortedComponents = this.getTopologicalSort();
    let totalFixed = 0;
    let totalErrors = 0;
    const fixedComponents: string[] = [];
    
    // Fix from leaves to root
    for (let i = 0; i < sortedComponents.length; i++) {
      const componentName = sortedComponents[i];
      const depth = this.calculateComponentDepth(componentName);
      
      console.log(`[GraphFixer] Processing ${componentName} (depth: ${depth}, ${i + 1}/${sortedComponents.length})`);
      
      // Check component in isolation
      const checkResult = await this.componentFixer.checkComponentIsolation(componentName);
      
      if (!checkResult.success && checkResult.errors.length > 0) {
        totalErrors += checkResult.errors.length;
        console.log(`[GraphFixer] Found ${checkResult.errors.length} errors in ${componentName}`);
        
        // Check if this error was already seen
        const errorFingerprint = this.createErrorFingerprint(checkResult.errors);
        const previousErrors = this.errorMemory.get(errorFingerprint);
        
        if (previousErrors) {
          console.log(`[GraphFixer] Error fingerprint already seen for ${componentName}, skipping`);
          continue;
        }
        
        // Store error fingerprint
        this.errorMemory.set(errorFingerprint, checkResult.errors);
        
        // Fix component errors
        const fixResult = await this.componentFixer.fixComponentErrors(componentName, checkResult.errors);
        
        if (fixResult.success) {
          totalFixed += fixResult.errorsFixed;
          fixedComponents.push(componentName);
          
          this.fixHistory.push({
            component: componentName,
            depth,
            errorsFixed: fixResult.errorsFixed,
            totalErrors: fixResult.totalErrors,
            timestamp: new Date().toISOString(),
            fallbackUsed: fixResult.fallbackUsed
          });
          
          console.log(`[GraphFixer] ✅ Fixed ${fixResult.errorsFixed} errors in ${componentName}`);
        } else {
          console.warn(`[GraphFixer] ❌ Failed to fix errors in ${componentName}`);
        }
      } else {
        console.log(`[GraphFixer] ✅ ${componentName} has no errors`);
      }
    }
    
    return {
      success: totalErrors === 0 || totalFixed > 0,
      totalFixed,
      totalErrors,
      fixedComponents,
      fixHistory: this.fixHistory,
      dependencyGraph: this.getDependencyGraphSummary()
    };
  }

  /**
   * Calculate component depth in dependency graph
   */
  private calculateComponentDepth(componentName: string): number {
    const visited = new Set<string>();
    
    const getDepth = (node: string): number => {
      if (visited.has(node)) {
        return 0;
      }
      
      visited.add(node);
      
      const dependencies = this.dependencyGraph.get(node) || new Set();
      if (dependencies.size === 0) {
        return 0; // Leaf node
      }
      
      let maxDepth = 0;
      for (const dep of dependencies) {
        maxDepth = Math.max(maxDepth, getDepth(dep));
      }
      
      return maxDepth + 1;
    };
    
    return getDepth(componentName);
  }

  /**
   * Create error fingerprint for memory
   */
  private createErrorFingerprint(errors: ComponentError[]): string {
    const errorSummary = errors.map(error => 
      `${error.type}:${error.code}:${error.message}`
    ).sort().join('|');
    
    return Buffer.from(errorSummary).toString('base64');
  }

  /**
   * Get components by depth (leaves first)
   */
  getComponentsByDepth(): Map<number, string[]> {
    const componentsByDepth = new Map<number, string[]>();
    
    for (const componentName of this.dependencyGraph.keys()) {
      const depth = this.calculateComponentDepth(componentName);
      
      if (!componentsByDepth.has(depth)) {
        componentsByDepth.set(depth, []);
      }
      componentsByDepth.get(depth)!.push(componentName);
    }
    
    return componentsByDepth;
  }

  /**
   * Get leaf components (no dependencies)
   */
  getLeafComponents(): string[] {
    const leaves: string[] = [];
    
    for (const [component, dependencies] of this.dependencyGraph.entries()) {
      if (dependencies.size === 0) {
        leaves.push(component);
      }
    }
    
    return leaves;
  }

  /**
   * Get root components (no dependents)
   */
  getRootComponents(): string[] {
    const roots: string[] = [];
    
    for (const [component, dependents] of this.reverseDependencyGraph.entries()) {
      if (dependents.size === 0) {
        roots.push(component);
      }
    }
    
    return roots;
  }

  /**
   * Get component dependencies
   */
  getComponentDependencies(componentName: string): string[] {
    return Array.from(this.dependencyGraph.get(componentName) || new Set());
  }

  /**
   * Get component dependents (what depends on this component)
   */
  getComponentDependents(componentName: string): string[] {
    return Array.from(this.reverseDependencyGraph.get(componentName) || new Set());
  }

  /**
   * Check if fixing a component would affect others
   */
  wouldAffectOthers(componentName: string): boolean {
    const dependents = this.getComponentDependents(componentName);
    return dependents.length > 0;
  }

  /**
   * Get affected components if a component is fixed
   */
  getAffectedComponents(componentName: string): string[] {
    const affected = new Set<string>();
    const visited = new Set<string>();
    
    const traverse = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      affected.add(node);
      
      const dependents = this.getComponentDependents(node);
      for (const dependent of dependents) {
        traverse(dependent);
      }
    };
    
    traverse(componentName);
    return Array.from(affected);
  }

  /**
   * Log dependency graph for debugging
   */
  private logDependencyGraph(): void {
    console.log(`[GraphFixer] Dependency Graph:`);
    for (const [component, dependencies] of this.dependencyGraph.entries()) {
      const deps = Array.from(dependencies);
      console.log(`  ${component} → [${deps.join(', ')}]`);
    }
    
    console.log(`[GraphFixer] Leaf components: [${this.getLeafComponents().join(', ')}]`);
    console.log(`[GraphFixer] Root components: [${this.getRootComponents().join(', ')}]`);
  }

  /**
   * Get dependency graph summary
   */
  private getDependencyGraphSummary(): DependencyGraphSummary {
    const componentsByDepth = this.getComponentsByDepth();
    const maxDepth = Math.max(...componentsByDepth.keys());
    
    return {
      totalComponents: this.dependencyGraph.size,
      maxDepth,
      leafComponents: this.getLeafComponents(),
      rootComponents: this.getRootComponents(),
      componentsByDepth: Object.fromEntries(componentsByDepth),
      hasCircularDependencies: this.detectCircularDependencies()
    };
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(): boolean {
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    
    const hasCycle = (node: string): boolean => {
      if (tempVisited.has(node)) {
        return true;
      }
      
      if (visited.has(node)) {
        return false;
      }
      
      tempVisited.add(node);
      
      const dependencies = this.dependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        if (hasCycle(dep)) {
          return true;
        }
      }
      
      tempVisited.delete(node);
      visited.add(node);
      return false;
    };
    
    for (const node of this.dependencyGraph.keys()) {
      if (hasCycle(node)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get component fixer instance
   */
  getComponentFixer(): ComponentLevelFixer {
    return this.componentFixer;
  }

  /**
   * Get fix history
   */
  getFixHistory(): FixHistory[] {
    return this.fixHistory;
  }

  /**
   * Clear error memory
   */
  clearErrorMemory(): void {
    this.errorMemory.clear();
  }

  /**
   * Get error memory stats
   */
  getErrorMemoryStats(): ErrorMemoryStats {
    return {
      totalFingerprints: this.errorMemory.size,
      totalErrors: Array.from(this.errorMemory.values()).flat().length,
      uniqueErrorTypes: new Set(Array.from(this.errorMemory.values()).flat().map(e => e.type)).size
    };
  }
}

// Types for graph-aware fixing
export interface GraphFixResult {
  success: boolean;
  totalFixed: number;
  totalErrors: number;
  fixedComponents: string[];
  fixHistory: FixHistory[];
  dependencyGraph: DependencyGraphSummary;
}

export interface FixHistory {
  component: string;
  depth: number;
  errorsFixed: number;
  totalErrors: number;
  timestamp: string;
  fallbackUsed: boolean;
}

export interface DependencyGraphSummary {
  totalComponents: number;
  maxDepth: number;
  leafComponents: string[];
  rootComponents: string[];
  componentsByDepth: Record<number, string[]>;
  hasCircularDependencies: boolean;
}

export interface ErrorMemoryStats {
  totalFingerprints: number;
  totalErrors: number;
  uniqueErrorTypes: number;
} 