import { AdvancedImportResolver, MonorepoConfig } from './advancedImportResolver';
import { GlobalSymbolTable, GlobalSymbol } from './codeGenerationEngine';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('AdvancedImportResolver - Basic Functionality', () => {
  let resolver: AdvancedImportResolver;
  let symbolTable: GlobalSymbolTable;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join(__dirname, '../../temp/simple-test');
    
    // Ensure test directory exists
    await fs.ensureDir(testProjectPath);
    
    // Create minimal symbol table
    symbolTable = {
      symbols: new Map<string, GlobalSymbol>(),
      methodSignatures: new Map(),
      typeDefinitions: new Map(),
      crossFileDependencies: new Map(),
      layerConsistency: new Map(),
      lastUpdated: new Date()
    };

    // Add a test symbol
    symbolTable.symbols.set('TestClass', {
      id: 'test-class',
      name: 'TestClass',
      type: 'class',
      filePath: 'src/models/TestClass.ts',
      layer: 'model',
      visibility: 'public',
      dependencies: [],
      dependents: [],
      lastModified: new Date()
    });

    resolver = new AdvancedImportResolver(testProjectPath, symbolTable);
  });

  afterEach(async () => {
    if (await fs.pathExists(testProjectPath)) {
      await fs.remove(testProjectPath);
    }
    if (resolver) {
      resolver.dispose();
    }
  });

  describe('Basic Functionality', () => {
    it('should initialize without errors', () => {
      expect(resolver).toBeDefined();
      expect(resolver['project']).toBeDefined();
    });

    it('should handle monorepo configuration', () => {
      const config = resolver['monorepoConfig'];
      expect(config).toBeDefined();
      expect(config.packages).toContain('backend');
      expect(config.packages).toContain('frontend');
      expect(config.aliases.has('@/')).toBe(true);
    });

    it('should resolve import paths correctly', () => {
      const resolvedPath = resolver.resolveImportPath('@/models/Test', 'src/controllers/TestController.ts');
      expect(resolvedPath).toBe(path.resolve(testProjectPath, 'src/models/Test'));
    });

    it('should handle relative imports', () => {
      const currentFilePath = path.join(testProjectPath, 'src/controllers/TestController.ts');
      const resolvedPath = resolver.resolveImportPath('../models/Test', currentFilePath);
      expect(resolvedPath).toBe(path.resolve(testProjectPath, 'src/models/Test'));
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await resolver.injectImportsFromSymbolTable('non-existent-file.ts');
      expect(result.success).toBe(false);
    });
  });

  describe('Symbol Table Integration', () => {
    it('should access symbol table correctly', () => {
      const symbol = symbolTable.symbols.get('TestClass');
      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('TestClass');
      expect(symbol?.type).toBe('class');
    });

    it('should generate import suggestions from symbol table', () => {
      const suggestions = resolver['generateImportSuggestions'](['TestClass']);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].imports).toContain('TestClass');
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', () => {
      // Test with invalid project path
      expect(() => {
        new AdvancedImportResolver('/invalid/path', symbolTable);
      }).not.toThrow();
    });

    it('should handle dispose method correctly', () => {
      expect(() => {
        resolver.dispose();
      }).not.toThrow();
    });
  });
}); 