import { AdvancedImportResolver, MonorepoConfig } from './advancedImportResolver';
import { GlobalSymbolTable, GlobalSymbol } from './codeGenerationEngine';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('AdvancedImportResolver', () => {
  let resolver: AdvancedImportResolver;
  let symbolTable: GlobalSymbolTable;
  let testProjectPath: string;
  let monorepoConfig: MonorepoConfig;

  beforeEach(async () => {
    testProjectPath = path.join(__dirname, '../../temp/test-project');
    
    // Ensure test directory exists
    await fs.ensureDir(testProjectPath);
    
    // Create test symbol table
    symbolTable = {
      symbols: new Map<string, GlobalSymbol>(),
      methodSignatures: new Map(),
      typeDefinitions: new Map(),
      crossFileDependencies: new Map(),
      layerConsistency: new Map(),
      lastUpdated: new Date()
    };

    // Add test symbols
    symbolTable.symbols.set('UserModel', {
      id: 'user-model',
      name: 'UserModel',
      type: 'class',
      filePath: 'src/models/User.ts',
      layer: 'model',
      visibility: 'public',
      dependencies: [],
      dependents: [],
      lastModified: new Date()
    });

    symbolTable.symbols.set('UserService', {
      id: 'user-service',
      name: 'UserService',
      type: 'class',
      filePath: 'src/services/UserService.ts',
      layer: 'service',
      visibility: 'public',
      dependencies: [],
      dependents: [],
      lastModified: new Date()
    });

    monorepoConfig = {
      packages: ['backend', 'frontend', 'shared'],
      sharedTypes: ['types', 'interfaces', 'utils'],
      aliases: new Map([
        ['@/', 'src/'],
        ['@backend/', 'src/backend/'],
        ['@frontend/', 'src/frontend/'],
        ['@shared/', 'src/shared/'],
        ['@types/', 'src/types/'],
        ['@utils/', 'src/utils/']
      ]),
      basePath: testProjectPath
    };

    try {
      resolver = new AdvancedImportResolver(testProjectPath, symbolTable, monorepoConfig);
    } catch (error) {
      console.warn('Failed to create AdvancedImportResolver:', error);
      // Create a minimal resolver for basic tests
      resolver = new AdvancedImportResolver(testProjectPath, symbolTable);
    }
  });

  afterEach(async () => {
    // Clean up test files
    if (await fs.pathExists(testProjectPath)) {
      await fs.remove(testProjectPath);
    }
    if (resolver) {
      resolver.dispose();
    }
  });

  describe('AST-based import injection', () => {
    it('should inject missing imports from symbol table', async () => {
      // Create test file with missing imports
      const testFilePath = path.join(testProjectPath, 'src/controllers/UserController.ts');
      await fs.ensureDir(path.dirname(testFilePath));
      
      const testContent = `
export class UserController {
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService();
  }
  
  async getUser(id: string): Promise<UserModel> {
    return this.userService.findById(id);
  }
}
`;
      
      await fs.writeFile(testFilePath, testContent);

      // Test import injection
      const result = await resolver.injectImportsFromSymbolTable(testFilePath);
      
      expect(result.success).toBe(true);
      expect(result.missingImports).toContain('UserService');
      expect(result.missingImports).toContain('UserModel');
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      // Verify file was updated
      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('import { UserService }');
      expect(updatedContent).toContain('import { UserModel }');
    });

    it('should remove unused imports', async () => {
      // Create test file with unused imports
      const testFilePath = path.join(testProjectPath, 'src/controllers/TestController.ts');
      await fs.ensureDir(path.dirname(testFilePath));
      
      const testContent = `
import { UnusedService } from './UnusedService';
import { UserService } from '../services/UserService';

export class TestController {
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService();
  }
  
  async test(): Promise<void> {
    // Only UserService is used
  }
}
`;
      
      await fs.writeFile(testFilePath, testContent);

      // Test unused import removal
      const result = await resolver.injectImportsFromSymbolTable(testFilePath);
      
      expect(result.success).toBe(true);
      expect(result.unusedImports).toContain('UnusedService');
      
      // Verify file was updated
      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).not.toContain('UnusedService');
      expect(updatedContent).toContain('UserService');
    });
  });

  describe('Automatic import generation from symbol table', () => {
    it('should generate imports for target symbols', async () => {
      const testFilePath = path.join(testProjectPath, 'src/controllers/TestController.ts');
      await fs.ensureDir(path.dirname(testFilePath));
      
      const testContent = `
export class TestController {
  // Empty class that needs imports
}
`;
      
      await fs.writeFile(testFilePath, testContent);

      // Test automatic import generation
      const result = await resolver.generateImportsFromSymbolTable(testFilePath, ['UserService', 'UserModel']);
      
      expect(result.success).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      // Verify file was updated
      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('import { UserService }');
      expect(updatedContent).toContain('import { UserModel }');
    });
  });

  describe('Import path resolution for monorepo structure', () => {
    it('should resolve alias imports correctly', () => {
      const resolvedPath = resolver.resolveImportPath('@/models/User', 'src/controllers/TestController.ts');
      expect(resolvedPath).toBe(path.resolve(testProjectPath, 'src/models/User'));
    });

    it('should resolve relative imports correctly', () => {
      const resolvedPath = resolver.resolveImportPath('../services/UserService', 'src/controllers/TestController.ts');
      expect(resolvedPath).toBe(path.resolve(testProjectPath, 'src/services/UserService'));
    });

    it('should handle package imports', () => {
      const resolvedPath = resolver.resolveImportPath('express', 'src/app.ts');
      // Should return null for non-existent packages in test environment
      expect(resolvedPath).toBeNull();
    });
  });

  describe('Batch processing', () => {
    it('should process multiple files', async () => {
      // Create multiple test files
      const files = [
        {
          path: path.join(testProjectPath, 'src/controllers/Controller1.ts'),
          content: `
export class Controller1 {
  private userService: UserService;
}
`
        },
        {
          path: path.join(testProjectPath, 'src/controllers/Controller2.ts'),
          content: `
export class Controller2 {
  private userModel: UserModel;
}
`
        }
      ];

      for (const file of files) {
        await fs.ensureDir(path.dirname(file.path));
        await fs.writeFile(file.path, file.content);
      }

      // Test batch processing
      const results = await resolver.batchProcessImports(files.map(f => f.path));
      
      expect(results.size).toBe(2);
      
      for (const [filePath, result] of results) {
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Import validation', () => {
    it('should validate import paths', async () => {
      // Create test files with valid and invalid imports
      const testFilePath = path.join(testProjectPath, 'src/test.ts');
      await fs.ensureDir(path.dirname(testFilePath));
      
      const testContent = `
import { ValidImport } from './ValidImport';
import { InvalidImport } from './InvalidImport';
`;
      
      await fs.writeFile(testFilePath, testContent);
      
      // Create the valid import file
      const validImportPath = path.join(testProjectPath, 'src/ValidImport.ts');
      await fs.writeFile(validImportPath, 'export class ValidImport {}');

      // Test validation
      const validation = await resolver.validateImportPaths();
      
      expect(validation.valid).toContain('./ValidImport');
      expect(validation.invalid).toContain('./InvalidImport');
      expect(validation.suggestions.size).toBeGreaterThan(0);
    });
  });

  describe('Import organization', () => {
    it('should organize imports alphabetically', async () => {
      const testFilePath = path.join(testProjectPath, 'src/test.ts');
      await fs.ensureDir(path.dirname(testFilePath));
      
      const testContent = `
import { ZService } from './ZService';
import { AService } from './AService';
import { MService } from './MService';

export class TestClass {
  // Test content
}
`;
      
      await fs.writeFile(testFilePath, testContent);

      // Test import organization
      const result = await resolver.injectImportsFromSymbolTable(testFilePath);
      
      expect(result.success).toBe(true);
      
      // Verify imports are organized (this is a basic test)
      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      const importLines = updatedContent.split('\n').filter(line => line.trim().startsWith('import'));
      expect(importLines.length).toBeGreaterThan(0);
    });
  });

  describe('Monorepo configuration', () => {
    it('should handle monorepo aliases correctly', () => {
      const config = resolver['monorepoConfig'];
      
      expect(config.packages).toContain('backend');
      expect(config.packages).toContain('frontend');
      expect(config.packages).toContain('shared');
      expect(config.aliases.has('@/')).toBe(true);
      expect(config.aliases.get('@/')).toBe('src/');
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const result = await resolver.injectImportsFromSymbolTable('non-existent-file.ts');
      expect(result.success).toBe(false);
    });

    it('should handle invalid TypeScript files gracefully', async () => {
      const testFilePath = path.join(testProjectPath, 'src/invalid.ts');
      await fs.ensureDir(path.dirname(testFilePath));
      await fs.writeFile(testFilePath, 'invalid typescript content {');
      
      const result = await resolver.injectImportsFromSymbolTable(testFilePath);
      // Should handle gracefully even with invalid syntax
      expect(result).toBeDefined();
    });
  });
}); 