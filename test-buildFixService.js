const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Use ts-node to run TypeScript files
require('ts-node').register();

// Import the buildFixService
const { buildFixService } = require('./src/services/buildFixService');

async function testBuildFixService() {
  console.log('🚀 Starting BuildFixService Test');
  console.log('=====================================\n');

  // Test project path
  const testProjectPath = path.join(__dirname, 'generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e');
  
  console.log(`�� Test Project Path: ${testProjectPath}`);
  console.log(`🔑 OpenAI Key Available: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`🔑 Anthropic Key Available: ${process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO'}\n`);

  try {
    // Check if test project exists
    if (!fs.existsSync(testProjectPath)) {
      console.error('❌ Test project directory does not exist!');
      console.log(`Expected path: ${testProjectPath}`);
      return;
    }

    console.log('✅ Test project directory found');
    
    // List files in the project
    console.log('\n📋 Project Structure:');
    const listFiles = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        const relativePath = path.relative(testProjectPath, fullPath);
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          console.log(`${prefix}📁 ${relativePath}/`);
          listFiles(fullPath, prefix + '  ');
        } else if (stat.isFile() && /\.(ts|js|json)$/.test(item)) {
          console.log(`${prefix}📄 ${relativePath}`);
        }
      });
    };
    listFiles(testProjectPath);

    // Check for TypeScript errors first
    console.log('\n🔍 Checking for TypeScript errors...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const backendPath = path.join(testProjectPath, 'backend');
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { 
        cwd: backendPath,
        timeout: 30000 
      });
      console.log('✅ No TypeScript errors found');
    } catch (error) {
      console.log('❌ TypeScript errors found:');
      console.log(error.stdout || error.stderr);
    }

    // Run the buildFixService
    console.log('\n🔧 Running BuildFixService...');
    console.log('=====================================');
    
    const startTime = Date.now();
    const result = await buildFixService.runBuildAndFixPipeline(testProjectPath, 'test-job-123');
    const endTime = Date.now();
    
    console.log('\n=====================================');
    console.log('📊 BuildFixService Results:');
    console.log('=====================================');
    console.log(`⏱️  Duration: ${endTime - startTime}ms`);
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔄 Retry Count: ${result.retryCount}`);
    console.log(`📝 Fixed Files: ${result.fixedFiles.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    console.log(`⚠️  Warnings: ${result.warnings.length}`);
    console.log(`📋 Logs: ${result.logs.length} entries`);

    if (result.fixedFiles.length > 0) {
      console.log('\n🔧 Fixed Files:');
      result.fixedFiles.forEach(file => {
        console.log(`  ✅ ${file}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Remaining Errors:');
      result.errors.forEach(error => {
        console.log(`  ❌ ${error.message}`);
      });
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning.message}`);
      });
    }

    // Show detailed logs
    console.log('\n📋 Detailed Logs:');
    console.log('=====================================');
    result.logs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    // Test specific error scenarios
    console.log('\n🧪 Testing Specific Error Scenarios...');
    await testSpecificErrors(path.join(testProjectPath, 'backend'));

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
}

async function testSpecificErrors(projectPath) {
  console.log('\n🔍 Testing specific error scenarios...');
  
  // Test 1: Missing @types/morgan
  console.log('\n📦 Test 1: Missing @types/morgan');
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    if (packageJson.devDependencies && packageJson.devDependencies['@types/morgan']) {
      console.log('  ✅ @types/morgan already exists');
    } else {
      console.log('  ❌ @types/morgan missing - this should trigger AI fix');
    }
  } catch (error) {
    console.log('  ❌ Error reading package.json:', error.message);
  }

  // Test 2: Type errors in CalculationService
  console.log('\n🔧 Test 2: Type errors in CalculationService');
  try {
    const servicePath = path.join(projectPath, 'src/services/CalculationService.ts');
    if (fs.existsSync(servicePath)) {
      const content = fs.readFileSync(servicePath, 'utf-8');
      if (content.includes('Promise<CalculationModel>')) {
        console.log('  ❌ Found type error: Promise<CalculationModel> should be Promise<ICalculation>');
      } else {
        console.log('  ✅ No type errors found in CalculationService');
      }
    } else {
      console.log('  ❌ CalculationService.ts not found');
    }
  } catch (error) {
    console.log('  ❌ Error reading CalculationService:', error.message);
  }

  // Test 3: Import/Export mismatches
  console.log('\n📤 Test 3: Import/Export mismatches');
  try {
    const routesPath = path.join(projectPath, 'src/routes/calculatorRoutes.ts');
    if (fs.existsSync(routesPath)) {
      const content = fs.readFileSync(routesPath, 'utf-8');
      if (content.includes('import { CalculatorController }')) {
        console.log('  ❌ Found import mismatch: should use default import');
      } else {
        console.log('  ✅ No import mismatches found');
      }
    } else {
      console.log('  ❌ calculatorRoutes.ts not found');
    }
  } catch (error) {
    console.log('  ❌ Error reading routes:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testBuildFixService()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testBuildFixService }; 