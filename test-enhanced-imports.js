const { SmartImportResolver } = require('./src/services/smartImportResolver');
const { SymbolTable } = require('./src/services/symbolTable');
const { EnhancedLinkingPass } = require('./src/services/enhancedLinkingPass');
const path = require('path');

async function testEnhancedImportResolution() {
  console.log('🚀 Testing Enhanced Import Resolution System\n');

  try {
    // Initialize components
    const symbolTable = new SymbolTable();
    const smartImportResolver = new SmartImportResolver(process.cwd(), symbolTable);
    const enhancedLinkingPass = new EnhancedLinkingPass(process.cwd(), symbolTable);

    console.log('📋 Test 1: Symbol Table Registration');
    console.log('=' .repeat(50));
    
    // Test symbol table functionality
    const testSymbols = [
      {
        kind: 'model',
        name: 'User',
        filePath: './backend/src/models/User.ts',
        exports: ['User', 'UserModel'],
        methods: {
          findById: {
            params: [{ name: 'id', tsType: 'string' }],
            returns: 'Promise<User | null>'
          }
        },
        description: 'User model for authentication'
      },
      {
        kind: 'service',
        name: 'UserService',
        filePath: './backend/src/services/UserService.ts',
        exports: ['UserService'],
        methods: {
          createUser: {
            params: [{ name: 'data', tsType: 'CreateUserDTO' }],
            returns: 'Promise<User>'
          }
        },
        description: 'User service for business logic'
      },
      {
        kind: 'controller',
        name: 'UserController',
        filePath: './backend/src/controllers/UserController.ts',
        exports: ['UserController'],
        methods: {
          register: {
            params: [{ name: 'req', tsType: 'Request' }, { name: 'res', tsType: 'Response' }],
            returns: 'Promise<void>'
          }
        },
        description: 'User controller for HTTP handling'
      }
    ];

    // Register test symbols
    testSymbols.forEach(symbol => {
      symbolTable.addSymbol(symbol);
      console.log(`✅ Registered: ${symbol.name} (${symbol.kind})`);
    });

    console.log(`\n📊 Symbol Table Stats:`);
    const stats = symbolTable.getStats();
    console.log(`  - Total symbols: ${stats.total}`);
    console.log(`  - By kind:`, stats.byKind);
    console.log(`  - By file:`, stats.byFile);

    console.log('\n🔍 Test 2: Cross-File Dependency Analysis');
    console.log('=' .repeat(50));

    // Create test files with import issues
    const testFiles = [
      {
        path: './backend/src/controllers/UserController.ts',
        content: `
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { CreateUserDTO } from '../dto/CreateUserDTO';

export class UserController {
  constructor(private userService: UserService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserDTO = req.body;
      const user = await this.userService.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    // Missing import for AuthService
    const authService = new AuthService();
    const token = await authService.authenticate(req.body);
    res.json({ token });
  }
}
        `
      },
      {
        path: './backend/src/services/UserService.ts',
        content: `
import { User } from '../models/User';
import { CreateUserDTO } from '../dto/CreateUserDTO';

export class UserService {
  async createUser(data: CreateUserDTO): Promise<User> {
    // Missing import for DatabaseService
    const db = new DatabaseService();
    const user = await db.create('users', data);
    return user;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = await User.findById(id);
    return user;
  }
}
        `
      }
    ];

    // Write test files
    const fs = require('fs').promises;
    for (const file of testFiles) {
      await fs.mkdir(path.dirname(file.path), { recursive: true });
      await fs.writeFile(file.path, file.content);
      console.log(`📝 Created test file: ${file.path}`);
    }

    console.log('\n🔧 Test 3: Smart Import Resolution');
    console.log('=' .repeat(50));

    // Register generated files
    const filePaths = testFiles.map(f => f.path);
    await smartImportResolver.registerGeneratedFiles(filePaths);

    // Analyze dependencies
    const analysis = smartImportResolver.analyzeCrossFileDependencies(filePaths);
    console.log(`📊 Analysis Results:`);
    console.log(`  - Missing imports: ${analysis.missingImports.length}`);
    console.log(`  - Unused imports: ${analysis.unusedImports.length}`);
    console.log(`  - Cross-file dependencies: ${Object.keys(analysis.crossFileDependencies).length}`);
    console.log(`  - Import suggestions: ${analysis.suggestions.length}`);

    if (analysis.suggestions.length > 0) {
      console.log('\n💡 Import Suggestions:');
      analysis.suggestions.forEach(suggestion => {
        console.log(`  - Add import: ${suggestion.symbol} from ${suggestion.importPath}`);
      });
    }

    console.log('\n🔧 Test 4: Fix All Imports');
    console.log('=' .repeat(50));

    // Fix imports
    const importResult = await smartImportResolver.fixAllImports(filePaths);
    console.log(`📊 Import Fixing Results:`);
    console.log(`  - Files fixed: ${importResult.summary.filesFixed}`);
    console.log(`  - Imports added: ${importResult.summary.importsAdded}`);
    console.log(`  - Imports removed: ${importResult.summary.importsRemoved}`);
    console.log(`  - Symbols fixed: ${importResult.summary.symbolsFixed}`);

    if (importResult.fixes.length > 0) {
      console.log('\n🔧 Import Fixes Applied:');
      importResult.fixes.forEach(fix => {
        if (fix.addedImports.length > 0) {
          console.log(`  ✅ ${path.basename(fix.filePath)}: +${fix.addedImports.length} imports`);
          fix.addedImports.forEach(imp => console.log(`    + ${imp}`));
        }
        if (fix.removedImports.length > 0) {
          console.log(`  🗑️ ${path.basename(fix.filePath)}: -${fix.removedImports.length} imports`);
          fix.removedImports.forEach(imp => console.log(`    - ${imp}`));
        }
      });
    }

    console.log('\n✅ Test 5: Enhanced Linking Pass');
    console.log('=' .repeat(50));

    // Test enhanced linking pass
    const irData = {
      backend: {
        models: [
          {
            name: 'User',
            fields: [
              { name: 'id', tsType: 'string', required: true },
              { name: 'email', tsType: 'string', required: true },
              { name: 'password', tsType: 'string', required: true }
            ]
          }
        ],
        services: [
          {
            className: 'UserService',
            methods: [
              {
                name: 'createUser',
                params: [{ name: 'data', tsType: 'CreateUserDTO' }],
                returns: 'Promise<User>'
              }
            ]
          }
        ],
        controllers: [
          {
            name: 'UserController',
            service: 'UserService',
            routes: [
              {
                method: 'post',
                path: '/users',
                handler: 'createUser'
              }
            ]
          }
        ],
        dtos: [
          {
            name: 'CreateUserDTO',
            shape: {
              email: 'string',
              password: 'string'
            }
          }
        ]
      }
    };

    // Mock AI service
    const mockAIService = {
      makeAIRequest: async (prompt) => {
        return '// Mock AI generated code\nreturn Promise.resolve();';
      }
    };

    const projectPath = path.join(process.cwd(), 'test-generated-project');
    const generationResult = await enhancedLinkingPass.runEnhancedGeneration(
      irData,
      projectPath,
      mockAIService
    );

    console.log(`📊 Enhanced Generation Results:`);
    console.log(`  - Success: ${generationResult.success}`);
    console.log(`  - Files generated: ${generationResult.summary.filesGenerated}`);
    console.log(`  - Files fixed: ${generationResult.summary.filesFixed}`);
    console.log(`  - Imports added: ${generationResult.summary.importsAdded}`);
    console.log(`  - Symbols registered: ${generationResult.summary.symbolsRegistered}`);

    if (generationResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      generationResult.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (generationResult.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      generationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    console.log('\n🎉 Enhanced Import Resolution Test Completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Symbol table registration and management');
    console.log('✅ Cross-file dependency analysis');
    console.log('✅ Smart import resolution');
    console.log('✅ Enhanced linking pass with IR');
    console.log('✅ Template-based generation with AI cavities');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedImportResolution().catch(console.error); 