import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

export type SymbolRecord = {
  kind: "model" | "service" | "controller" | "route" | "middleware" | "dto" | "util" | "component" | "page" | "hook";
  name: string;
  filePath: string;
  exports: string[];
  methods?: Record<string, { 
    params: { name: string; tsType: string }[]; 
    returns: string;
    description?: string;
  }>;
  imports?: string[];
  dependencies?: string[];
  description?: string;
};

export class SymbolTable {
  private map = new Map<string, SymbolRecord>();

  constructor(initialRecords?: SymbolRecord[]) {
    if (initialRecords) {
      initialRecords.forEach(record => this.map.set(record.name, record));
    }
  }

  get = (name: string): SymbolRecord | undefined => this.map.get(name);
  set = (record: SymbolRecord): void => {
    this.map.set(record.name, record);
  };
  has = (name: string): boolean => this.map.has(name);
  values = (): SymbolRecord[] => [...this.map.values()];
  keys = (): string[] => [...this.map.keys()];
  clear = (): void => this.map.clear();
  size = (): number => this.map.size;

  // Find symbols by kind
  findByKind = (kind: SymbolRecord['kind']): SymbolRecord[] => {
    return this.values().filter(record => record.kind === kind);
  };

  // Find symbols by partial name match
  findByName = (partialName: string): SymbolRecord[] => {
    return this.values().filter(record => 
      record.name.toLowerCase().includes(partialName.toLowerCase())
    );
  };

  // Get all exports for a given file
  getExportsForFile = (filePath: string): string[] => {
    const record = this.values().find(r => r.filePath === filePath);
    return record?.exports || [];
  };

  // Get all methods for a given symbol
  getMethodsForSymbol = (name: string): Record<string, { params: { name: string; tsType: string }[]; returns: string }> => {
    const record = this.get(name);
    return record?.methods || {};
  };

  // Check if a method exists on a symbol
  hasMethod = (symbolName: string, methodName: string): boolean => {
    const methods = this.getMethodsForSymbol(symbolName);
    return methodName in methods;
  };

  // Get method signature
  getMethodSignature = (symbolName: string, methodName: string): { params: { name: string; tsType: string }[]; returns: string } | null => {
    const methods = this.getMethodsForSymbol(symbolName);
    return methods[methodName] || null;
  };

  // Add a new symbol record
  addSymbol = (record: SymbolRecord): void => {
    this.map.set(record.name, record);
  };

  // Update an existing symbol record
  updateSymbol = (name: string, updates: Partial<SymbolRecord>): void => {
    const existing = this.get(name);
    if (existing) {
      this.map.set(name, { ...existing, ...updates });
    }
  };

  // Remove a symbol
  removeSymbol = (name: string): boolean => {
    return this.map.delete(name);
  };

  // Get all symbols that depend on a given symbol
  getDependents = (symbolName: string): SymbolRecord[] => {
    return this.values().filter(record => 
      record.dependencies?.includes(symbolName)
    );
  };

  // Get all symbols that a given symbol depends on
  getDependencies = (symbolName: string): SymbolRecord[] => {
    const record = this.get(symbolName);
    if (!record?.dependencies) return [];
    
    return record.dependencies
      .map(depName => this.get(depName))
      .filter((dep): dep is SymbolRecord => dep !== undefined);
  };

  // Export to JSON
  toJSON = (): SymbolRecord[] => [...this.map.values()];

  // Import from JSON
  fromJSON = (data: SymbolRecord[]): void => {
    this.map.clear();
    data.forEach(record => this.map.set(record.name, record));
  };

  // Save to file
  async saveToFile(filePath: string): Promise<void> {
    const data = JSON.stringify(this.toJSON(), null, 2);
    await promisify(fs.writeFile)(filePath, data, 'utf-8');
  }

  // Load from file
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const data = await promisify(fs.readFile)(filePath, 'utf-8');
      const records: SymbolRecord[] = JSON.parse(data);
      this.fromJSON(records);
    } catch (error) {
      console.warn(`[SymbolTable] Could not load symbol table from ${filePath}:`, error);
      // Start with empty table if file doesn't exist or is invalid
    }
  }

  // Merge with another symbol table
  merge = (other: SymbolTable): void => {
    other.values().forEach(record => {
      this.map.set(record.name, record);
    });
  }

  // Get statistics
  getStats = () => {
    const stats = {
      total: this.size(),
      byKind: {} as Record<string, number>,
      byFile: {} as Record<string, number>
    };

    this.values().forEach(record => {
      // Count by kind
      stats.byKind[record.kind] = (stats.byKind[record.kind] || 0) + 1;
      
      // Count by file
      const dir = path.dirname(record.filePath);
      stats.byFile[dir] = (stats.byFile[dir] || 0) + 1;
    });

    return stats;
  };

  // Validate symbol table integrity
  validate = (): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.values().forEach(record => {
      // Check for missing dependencies
      if (record.dependencies) {
        record.dependencies.forEach(dep => {
          if (!this.has(dep)) {
            errors.push(`Symbol '${record.name}' depends on missing symbol '${dep}'`);
          }
        });
      }

      // Check for duplicate names
      const duplicates = this.values().filter(r => r.name === record.name);
      if (duplicates.length > 1) {
        errors.push(`Duplicate symbol name: '${record.name}'`);
      }

      // Check for invalid file paths
      if (!record.filePath) {
        errors.push(`Symbol '${record.name}' has no file path`);
      }

      // Check for empty exports
      if (record.exports.length === 0) {
        warnings.push(`Symbol '${record.name}' has no exports`);
      }
    });

    return { errors, warnings };
  };

  // Get dependency graph
  getDependencyGraph = (): Map<string, string[]> => {
    const graph = new Map<string, string[]>();
    
    this.values().forEach(record => {
      graph.set(record.name, record.dependencies || []);
    });

    return graph;
  };

  // Check for circular dependencies
  hasCircularDependencies = (): boolean => {
    const graph = this.getDependencyGraph();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (hasCycle(node)) return true;
    }

    return false;
  };
}

export default SymbolTable; 