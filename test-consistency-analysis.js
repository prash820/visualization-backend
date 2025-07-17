const path = require('path');
const fs = require('fs/promises');
const { existsSync } = require('fs');
require('dotenv').config();

// Use ts-node to run TypeScript files
require('ts-node').register();

// Import the backend component agent
const { generateBackendComponents } = require('./src/agents/backendComponentAgent');

async function testConsistencyAnalysis() {
  console.log('🧪 Testing Consistency Analysis');
  console.log('==============================\n');

  // Test project path
  const testProjectPath = path.join(__dirname, 'generated-projects/consistency-test');
  
  console.log(`📁 Test Project Path: ${testProjectPath}`);

  try {
    // Clean up existing test project
    if (existsSync(testProjectPath)) {
      await fs.rm(testProjectPath, { recursive: true, force: true });
      console.log('🧹 Cleaned up existing test project');
    }

    // Create test project directory
    await fs.mkdir(testProjectPath, { recursive: true });

    // Create a code plan with a specific method name that should be consistent
    const consistencyCodePlan = {
      backendComponents: [
        { name: 'CalculatorService', children: ['CalculatorController', 'CalculatorRoutes'] }
      ],
      backendModels: [
        { name: 'Calculation', properties: ['expression', 'result', 'timestamp'] }
      ],
      backendDependencies: ['express', 'cors', 'helmet'],
      frontendComponents: [],
      frontendModels: [],
      frontendDependencies: [],
      fileStructure: {
        frontend: [],
        backend: [
          {
            path: 'src/controllers/CalculatorController.ts',
            content: '',
            dependencies: ['../services/CalculationService'],
            description: 'Calculator API controller that calls performCalculation'
          },
          {
            path: 'src/services/CalculationService.ts',
            content: '',
            dependencies: ['../models/Calculation'],
            description: 'Calculator business logic service with performCalculation method'
          },
          {
            path: 'src/models/Calculation.ts',
            content: '',
            dependencies: [],
            description: 'Calculation data model'
          }
        ]
      },
      integration: {
        apiEndpoints: [
          { path: '/api/calculator/calculate', method: 'POST', description: 'Calculate mathematical expression' }
        ],
        dataFlow: []
      }
    };

    console.log('🚀 Starting consistency-aware backend generation...');
    
    // Generate backend components
    await generateBackendComponents(consistencyCodePlan, testProjectPath);
    
    console.log('✅ Consistency-aware backend generation completed!');
    
    // Verify the generated structure and check for consistency
    console.log('\n📋 Verifying generated consistency...');
    
    const backendPath = path.join(testProjectPath, 'backend');
    
    // Check if main files exist and analyze their consistency
    const filesToCheck = [
      'src/controllers/CalculatorController.ts',
      'src/services/CalculationService.ts',
      'src/models/Calculation.ts'
    ];
    
    for (const file of filesToCheck) {
      const filePath = path.join(backendPath, file);
      if (existsSync(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`✅ ${file} exists (${content.length} chars)`);
        
        // Analyze the file for method calls and definitions
        const methodCalls = content.match(/this\.\w+\.(\w+)\(/g) || [];
        const methodDefs = content.match(/async\s+(\w+)\s*\(/g) || [];
        const interfaceDefs = content.match(/interface\s+(\w+)/g) || [];
        
        console.log(`   - Method calls: ${methodCalls.map(m => m.replace(/this\.\w+\.(\w+)\(/, '$1')).join(', ')}`);
        console.log(`   - Method definitions: ${methodDefs.map(m => m.replace(/async\s+(\w+)\s*\(/, '$1')).join(', ')}`);
        console.log(`   - Interfaces: ${interfaceDefs.map(i => i.replace(/interface\s+(\w+)/, '$1')).join(', ')}`);
        
        // Check for specific consistency patterns
        if (file.includes('Controller')) {
          const hasPerformCalculationCall = content.includes('performCalculation');
          console.log(`   - Calls performCalculation: ${hasPerformCalculationCall ? '✅' : '❌'}`);
        }
        
        if (file.includes('Service')) {
          const hasPerformCalculationMethod = content.includes('performCalculation');
          console.log(`   - Has performCalculation method: ${hasPerformCalculationMethod ? '✅' : '❌'}`);
        }
      } else {
        console.log(`❌ ${file} missing`);
      }
    }
    
    // Test TypeScript compilation
    console.log('\n🔧 Testing TypeScript compilation...');
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { 
        cwd: backendPath,
        timeout: 30000 
      });
      
      if (stderr && stderr.trim()) {
        console.log(`⚠️ TypeScript warnings: ${stderr.substring(0, 200)}...`);
      } else {
        console.log('✅ TypeScript compilation successful');
      }
    } catch (compilationError) {
      console.log(`❌ TypeScript compilation failed: ${compilationError.message}`);
    }
    
    console.log('\n🎉 Consistency analysis test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConsistencyAnalysis().catch(console.error); 