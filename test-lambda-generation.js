const path = require('path');
const fs = require('fs/promises');
const { existsSync } = require('fs');
require('dotenv').config();

// Use ts-node to run TypeScript files
require('ts-node').register();

// Import the backend component agent
const { generateBackendComponents } = require('./src/agents/backendComponentAgent');

async function testLambdaGeneration() {
  console.log('🧪 Testing Lambda Backend Generation');
  console.log('====================================\n');

  // Test project path
  const testProjectPath = path.join(__dirname, 'generated-projects/lambda-test');
  
  console.log(`📁 Test Project Path: ${testProjectPath}`);

  try {
    // Clean up existing test project
    if (existsSync(testProjectPath)) {
      await fs.rm(testProjectPath, { recursive: true, force: true });
      console.log('🧹 Cleaned up existing test project');
    }

    // Create test project directory
    await fs.mkdir(testProjectPath, { recursive: true });

    // Create a simple Lambda-focused code plan
    const lambdaCodePlan = {
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
            path: 'src/index.ts',
            content: '',
            dependencies: [],
            description: 'Lambda entry point with Express app'
          },
          {
            path: 'src/controllers/CalculatorController.ts',
            content: '',
            dependencies: ['../services/CalculatorService'],
            description: 'Calculator API controller'
          },
          {
            path: 'src/services/CalculatorService.ts',
            content: '',
            dependencies: ['../models/Calculation'],
            description: 'Calculator business logic service'
          },
          {
            path: 'src/routes/calculatorRoutes.ts',
            content: '',
            dependencies: ['../controllers/CalculatorController'],
            description: 'Calculator API routes'
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

    console.log('🚀 Starting Lambda backend generation...');
    
    // Generate backend components
    await generateBackendComponents(lambdaCodePlan, testProjectPath);
    
    console.log('✅ Lambda backend generation completed!');
    
    // Verify the generated structure
    console.log('\n📋 Verifying generated Lambda structure...');
    
    const backendPath = path.join(testProjectPath, 'backend');
    const srcPath = path.join(backendPath, 'src');
    
    // Check if main files exist
    const filesToCheck = [
      'src/index.ts',
      'src/controllers/CalculatorController.ts',
      'src/services/CalculatorService.ts',
      'src/routes/calculatorRoutes.ts',
      'src/models/Calculation.ts',
      'package.json',
      'tsconfig.json'
    ];
    
    for (const file of filesToCheck) {
      const filePath = path.join(backendPath, file);
      if (existsSync(filePath)) {
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`✅ ${file} exists (${content.length} chars)`);
        
        // Check for Lambda-specific patterns
        if (file === 'src/index.ts') {
          const hasLambdaHandler = content.includes('export const handler') || content.includes('serverless-http');
          const hasNoListen = !content.includes('app.listen');
          console.log(`   - Lambda handler: ${hasLambdaHandler ? '✅' : '❌'}`);
          console.log(`   - No app.listen: ${hasNoListen ? '✅' : '❌'}`);
        }
        
        if (file === 'package.json') {
          try {
            const pkg = JSON.parse(content);
            const hasServerlessHttp = pkg.dependencies && pkg.dependencies['serverless-http'];
            const hasBuildScript = pkg.scripts && pkg.scripts.build;
            const hasDeployScript = pkg.scripts && pkg.scripts.deploy;
            console.log(`   - serverless-http dependency: ${hasServerlessHttp ? '✅' : '❌'}`);
            console.log(`   - build script: ${hasBuildScript ? '✅' : '❌'}`);
            console.log(`   - deploy script: ${hasDeployScript ? '✅' : '❌'}`);
          } catch (e) {
            console.log(`   - Invalid package.json: ❌`);
          }
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
    
    console.log('\n🎉 Lambda backend generation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}
  
// Run the test
testLambdaGeneration().catch(console.error);