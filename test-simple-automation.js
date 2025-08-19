#!/usr/bin/env node

/**
 * Simple Automation Pipeline Test
 * Tests basic functionality without full server
 */

const fs = require('fs').promises;
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testFileStructure() {
  log(`${colors.bright}${colors.magenta}📁 Testing File Structure${colors.reset}`, 'magenta');
  
  try {
    // Check if automation service file exists
    const automationServicePath = path.join(__dirname, 'src', 'services', 'automationService.ts');
    await fs.access(automationServicePath);
    logSuccess('AutomationService.ts exists');
    
    // Check if automation controller exists
    const automationControllerPath = path.join(__dirname, 'src', 'controllers', 'automationController.ts');
    await fs.access(automationControllerPath);
    logSuccess('AutomationController.ts exists');
    
    // Check if automation routes exist
    const automationRoutesPath = path.join(__dirname, 'src', 'routes', 'automation.ts');
    await fs.access(automationRoutesPath);
    logSuccess('Automation routes exist');
    
    // Check if app code converter exists
    const appCodeConverterPath = path.join(__dirname, 'src', 'services', 'appCodeConverter.ts');
    await fs.access(appCodeConverterPath);
    logSuccess('AppCodeConverter.ts exists');
    
    // Check if test files exist
    const testFiles = [
      'test-automation-pipeline.js',
      'test-app-code-conversion.js',
      'AUTOMATION_PIPELINE_SYSTEM.md'
    ];
    
    for (const testFile of testFiles) {
      const testFilePath = path.join(__dirname, testFile);
      await fs.access(testFilePath);
      logSuccess(`${testFile} exists`);
    }
    
    logSuccess('All required files exist');
    return true;
    
  } catch (error) {
    logError(`File structure test failed: ${error.message}`);
    return false;
  }
}

async function testGeneratedProjectsStructure() {
  log(`${colors.bright}${colors.magenta}📂 Testing Generated Projects Structure${colors.reset}`, 'magenta');
  
  try {
    const generatedProjectsPath = path.join(__dirname, 'generated-projects');
    
    // Create generated-projects directory if it doesn't exist
    try {
      await fs.access(generatedProjectsPath);
    } catch {
      await fs.mkdir(generatedProjectsPath, { recursive: true });
      logInfo('Created generated-projects directory');
    }
    
    // Check existing project structure
    const existingProjectPath = path.join(generatedProjectsPath, '52f33c5f-0e08-4cde-bb62-3e6eb44f6cd5');
    try {
      await fs.access(existingProjectPath);
      logSuccess('Existing project structure found');
      
      // Check for key directories
      const checks = [
        { path: 'backend', type: 'directory' },
        { path: 'backend/src', type: 'directory' },
        { path: 'backend/package.json', type: 'file' }
      ];
      
      for (const check of checks) {
        const fullPath = path.join(existingProjectPath, check.path);
        try {
          const stat = await fs.stat(fullPath);
          if (check.type === 'directory' && stat.isDirectory()) {
            logInfo(`✅ ${check.path} (directory)`);
          } else if (check.type === 'file' && stat.isFile()) {
            logInfo(`✅ ${check.path} (file)`);
          }
        } catch {
          logError(`❌ ${check.path} (not found)`);
        }
      }
      
    } catch {
      logInfo('No existing project structure found');
    }
    
    return true;
    
  } catch (error) {
    logError(`Generated projects structure test failed: ${error.message}`);
    return false;
  }
}

async function testTerraformStructure() {
  log(`${colors.bright}${colors.magenta}🏗️  Testing Terraform Structure${colors.reset}`, 'magenta');
  
  try {
    const terraformRunnerPath = path.join(__dirname, 'terraform-runner');
    const workspacePath = path.join(terraformRunnerPath, 'workspace');
    
    // Check if terraform-runner exists
    try {
      await fs.access(terraformRunnerPath);
      logSuccess('terraform-runner directory exists');
    } catch {
      logError('terraform-runner directory not found');
      return false;
    }
    
    // Check if workspace exists
    try {
      await fs.access(workspacePath);
      logSuccess('terraform-runner/workspace exists');
    } catch {
      logError('terraform-runner/workspace not found');
      return false;
    }
    
    // Check existing project terraform files
    const existingProjectPath = path.join(workspacePath, '52f33c5f-0e08-4cde-bb62-3e6eb44f6cd5');
    try {
      await fs.access(existingProjectPath);
      logSuccess('Existing terraform project found');
      
      // Check for terraform files
      const terraformFiles = ['terraform.tf', 'main.tf'];
      for (const file of terraformFiles) {
        const filePath = path.join(existingProjectPath, file);
        try {
          await fs.access(filePath);
          logInfo(`✅ ${file} exists`);
        } catch {
          logInfo(`⚠️  ${file} not found`);
        }
      }
      
    } catch {
      logInfo('No existing terraform project found');
    }
    
    return true;
    
  } catch (error) {
    logError(`Terraform structure test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bright}${colors.magenta}🧪 Simple Automation Pipeline Test${colors.reset}`, 'magenta');
  log(`Testing file structure and project organization`, 'blue');

  const tests = [
    { name: 'File Structure', fn: testFileStructure },
    { name: 'Generated Projects Structure', fn: testGeneratedProjectsStructure },
    { name: 'Terraform Structure', fn: testTerraformStructure }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      logError(`Test "${test.name}" failed with error: ${error.message}`);
    }
  }

  // Summary
  log(`\n${colors.bright}${colors.magenta}📊 Test Summary${colors.reset}`, 'magenta');
  log(`Passed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! File structure and project organization are correct.');
    logInfo('The automation pipeline system is properly set up.');
    logInfo('Next steps:');
    logInfo('1. Start the server: npm run dev');
    logInfo('2. Test the API: curl http://localhost:5001/api/automation/health');
    logInfo('3. Run full test: node test-automation-pipeline.js');
  } else {
    logError(`⚠️  ${totalTests - passedTests} tests failed. Please check the system.`);
  }

  return passedTests === totalTests;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testFileStructure,
  testGeneratedProjectsStructure,
  testTerraformStructure
}; 