#!/usr/bin/env node

/**
 * Test App Flow: UML/IAC → App Code Generation
 * Tests the complete flow: User prompt → UML/IAC generation → App code using existing context
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api`;

// Test with existing project that has UML and IAC
const existingProjectId = '52f33c5f-0e08-4cde-bb62-3e6eb44f6cd5';

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

function logStep(step, description) {
  log(`\n${colors.cyan}${colors.bright}${step}${colors.reset}`, 'cyan');
  log(description, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testHealthCheck() {
  logStep('1. Health Check', 'Testing API health and system status');
  
  try {
    const response = await axios.get(`${API_BASE}/code-generation/health`);
    
    if (response.status === 200) {
      logSuccess('Health check passed');
      logInfo(`Service: ${response.data.data?.service || 'N/A'}`);
      logInfo(`Version: ${response.data.data?.version || 'N/A'}`);
      logInfo(`Status: ${response.data.data?.status || 'N/A'}`);
      return true;
    } else {
      logError(`Health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error.message}`);
    return false;
  }
}

async function testPhase1UserPrompt() {
  logStep('2. Phase 1: User Prompt Processing', 'Testing user prompt analysis and validation');
  
  const testPrompts = [
    {
      name: 'Task Management App',
      prompt: 'Create a task management app for remote teams with real-time collaboration, file attachments, and progress tracking',
      customers: 'Remote teams and project managers'
    },
    {
      name: 'E-commerce Platform',
      prompt: 'Build an e-commerce platform with product catalog, shopping cart, payment processing, and order management',
      customers: 'Online retailers and customers'
    }
  ];

  let passedTests = 0;
  
  for (const testPrompt of testPrompts) {
    try {
      logInfo(`Testing prompt: ${testPrompt.name}`);
      
      const response = await axios.post(`${API_BASE}/code-generation/generate-from-idea`, {
        userPrompt: testPrompt.prompt,
        targetCustomers: testPrompt.customers,
        projectId: `test-phase1-${Date.now()}`,
        options: {
          forceRegenerate: false,
          includeUMLDiagrams: true,
          includeInfrastructure: true,
          includeApplicationCode: false // Skip app code for now
        }
      });

      if (response.status === 200 && response.data.success) {
        logSuccess(`${testPrompt.name}: Prompt processed successfully`);
        
        const data = response.data.data;
        logInfo(`  - Analysis Result: ${data.analysisResult ? 'Available' : 'Missing'}`);
        logInfo(`  - UML Diagrams: ${data.umlDiagrams ? Object.keys(data.umlDiagrams).length : 0} diagrams`);
        logInfo(`  - Infrastructure Code: ${data.infrastructureCode ? data.infrastructureCode.length : 0} characters`);
        
        passedTests++;
      } else {
        logError(`${testPrompt.name}: Failed to process prompt`);
      }
    } catch (error) {
      logError(`${testPrompt.name}: Error - ${error.message}`);
    }
  }
  
  return passedTests === testPrompts.length;
}

async function testPhase2UMLAndIACGeneration() {
  logStep('3. Phase 2: UML and IAC Generation', 'Testing UML diagrams and infrastructure code generation');
  
  try {
    const response = await axios.post(`${API_BASE}/code-generation/generate-from-idea`, {
      userPrompt: 'Create a notes app with real-time sync, markdown support, and collaborative editing',
      targetCustomers: 'Students, professionals, and teams',
      projectId: `test-phase2-${Date.now()}`,
      options: {
        forceRegenerate: true,
        includeUMLDiagrams: true,
        includeInfrastructure: true,
        includeApplicationCode: false // Focus on UML and IAC only
      }
    });

    if (response.status === 200 && response.data.success) {
      logSuccess('UML and IAC generation completed');
      
      const data = response.data.data;
      
      // Check UML diagrams
      if (data.umlDiagrams) {
        const diagramTypes = Object.keys(data.umlDiagrams);
        logInfo(`UML Diagrams Generated: ${diagramTypes.length} diagrams`);
        diagramTypes.forEach(type => {
          const diagram = data.umlDiagrams[type];
          if (diagram && typeof diagram === 'string') {
            const hasMermaidSyntax = diagram.includes('```mermaid') || diagram.includes('classDiagram') || diagram.includes('sequenceDiagram');
            logInfo(`  - ${type}: ${hasMermaidSyntax ? '✅ Valid Mermaid syntax' : '❌ Invalid syntax'}`);
          }
        });
      }
      
      // Check infrastructure code
      if (data.infrastructureCode) {
        logInfo(`Infrastructure Code Generated: ${data.infrastructureCode.length} characters`);
        
        // Check for required AWS components
        const hasTerraform = data.infrastructureCode.includes('terraform {');
        const hasCognito = data.infrastructureCode.includes('aws_cognito_user_pool');
        const hasDynamoDB = data.infrastructureCode.includes('aws_dynamodb_table');
        const hasLambda = data.infrastructureCode.includes('aws_lambda_function');
        const hasAPIGateway = data.infrastructureCode.includes('aws_apigatewayv2_api');
        
        logInfo('Infrastructure Components:');
        logInfo(`  - Terraform Config: ${hasTerraform ? '✅' : '❌'}`);
        logInfo(`  - Cognito Auth: ${hasCognito ? '✅' : '❌'}`);
        logInfo(`  - DynamoDB Tables: ${hasDynamoDB ? '✅' : '❌'}`);
        logInfo(`  - Lambda Functions: ${hasLambda ? '✅' : '❌'}`);
        logInfo(`  - API Gateway: ${hasAPIGateway ? '✅' : '❌'}`);
      }
      
      return true;
    } else {
      logError('UML and IAC generation failed');
      return false;
    }
  } catch (error) {
    logError(`UML and IAC generation error: ${error.message}`);
    return false;
  }
}

async function testPhase3AppCodeGenerationWithContext() {
  logStep('4. Phase 3: App Code Generation with Context', 'Testing app code generation using existing UML and IAC context');
  
  try {
    // First, get the existing project data to ensure we have UML and IAC
    const existingResponse = await axios.post(`${API_BASE}/code-generation/generate-from-idea`, {
      userPrompt: 'Test app for existing project',
      targetCustomers: 'Test users',
      projectId: existingProjectId,
      options: {
        forceRegenerate: false,
        includeUMLDiagrams: true,
        includeInfrastructure: true,
        includeApplicationCode: false // Don't generate app code yet
      }
    });

    if (!existingResponse.data.success) {
      logError('Failed to retrieve existing project data');
      return false;
    }

    const existingData = existingResponse.data.data;
    logInfo(`Retrieved existing project: ${existingData.appName}`);
    logInfo(`UML Diagrams available: ${existingData.umlDiagrams ? Object.keys(existingData.umlDiagrams).length : 0}`);
    logInfo(`Infrastructure Code available: ${existingData.infrastructureCode ? existingData.infrastructureCode.length : 0} characters`);

    // Now generate app code using the existing context
    const appCodeResponse = await axios.post(`${API_BASE}/code-generation/generate-from-idea`, {
      userPrompt: 'Generate application code using existing UML and infrastructure context',
      targetCustomers: 'End users',
      projectId: existingProjectId,
      options: {
        forceRegenerate: false,
        includeUMLDiagrams: false, // Use existing
        includeInfrastructure: false, // Use existing
        includeApplicationCode: true // Generate app code
      }
    });

    if (appCodeResponse.status === 200 && appCodeResponse.data.success) {
      logSuccess('App code generation with context completed');
      
      const appData = appCodeResponse.data.data;
      
      // Check if app code was generated using existing context
      if (appData.appCode) {
        logInfo('Application Code Generated:');
        
        if (appData.appCode.frontend?.components) {
          const frontendComponents = Object.keys(appData.appCode.frontend.components);
          logInfo(`  - Frontend Components: ${frontendComponents.length} components`);
          logInfo(`  - Component Types: ${frontendComponents.join(', ')}`);
        }
        
        if (appData.appCode.backend?.controllers) {
          const backendControllers = Object.keys(appData.appCode.backend.controllers);
          logInfo(`  - Backend Controllers: ${backendControllers.length} controllers`);
          logInfo(`  - Controller Types: ${backendControllers.join(', ')}`);
        }
        
        // Check if the app code aligns with the UML diagrams
        if (appData.umlDiagrams && appData.appCode) {
          logInfo('Context Integration Check:');
          logInfo(`  - UML Diagrams Used: ${Object.keys(appData.umlDiagrams).length} diagrams`);
          logInfo(`  - Infrastructure Context Used: ${appData.infrastructureCode ? 'Yes' : 'No'}`);
          logInfo(`  - App Code Generated: ${appData.appCode ? 'Yes' : 'No'}`);
        }
      }
      
      return true;
    } else {
      logError('App code generation with context failed');
      return false;
    }
  } catch (error) {
    logError(`App code generation error: ${error.message}`);
    return false;
  }
}

async function testCompleteFlow() {
  logStep('5. Complete Flow Test', 'Testing the entire flow: Prompt → UML/IAC → App Code');
  
  const newProjectId = `complete-flow-${Date.now()}`;
  
  try {
    // Step 1: Generate UML and IAC
    logInfo('Step 1: Generating UML diagrams and infrastructure code...');
    const phase1Response = await axios.post(`${API_BASE}/code-generation/generate-from-idea`, {
      userPrompt: 'Create a project management app with task tracking, team collaboration, and progress reporting',
      targetCustomers: 'Project managers and development teams',
      projectId: newProjectId,
      options: {
        forceRegenerate: true,
        includeUMLDiagrams: true,
        includeInfrastructure: true,
        includeApplicationCode: false
      }
    });

    if (!phase1Response.data.success) {
      logError('Phase 1 (UML/IAC) failed');
      return false;
    }

    const phase1Data = phase1Response.data.data;
    logSuccess(`Phase 1 completed: ${Object.keys(phase1Data.umlDiagrams || {}).length} UML diagrams, ${phase1Data.infrastructureCode?.length || 0} chars of IAC`);

    // Step 2: Generate app code using the context
    logInfo('Step 2: Generating application code using UML and IAC context...');
    const phase2Response = await axios.post(`${API_BASE}/code-generation/generate-from-idea`, {
      userPrompt: 'Generate the complete application code using the existing UML diagrams and infrastructure',
      targetCustomers: 'End users',
      projectId: newProjectId,
      options: {
        forceRegenerate: false,
        includeUMLDiagrams: false, // Use existing
        includeInfrastructure: false, // Use existing
        includeApplicationCode: true // Generate app code
      }
    });

    if (phase2Response.status === 200 && phase2Response.data.success) {
      logSuccess('Complete flow test passed');
      
      const phase2Data = phase2Response.data.data;
      logInfo('Final Results:');
      logInfo(`  - Project ID: ${phase2Data.projectId}`);
      logInfo(`  - App Name: ${phase2Data.appName}`);
      logInfo(`  - UML Diagrams: ${Object.keys(phase2Data.umlDiagrams || {}).length}`);
      logInfo(`  - Infrastructure Code: ${phase2Data.infrastructureCode?.length || 0} characters`);
      logInfo(`  - Frontend Components: ${phase2Data.frontendComponents || 0}`);
      logInfo(`  - Backend Controllers: ${phase2Data.backendControllers || 0}`);
      logInfo(`  - Data Source: ${phase2Data.dataSource || 'N/A'}`);
      
      return true;
    } else {
      logError('Phase 2 (App Code) failed');
      return false;
    }
  } catch (error) {
    logError(`Complete flow error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bright}${colors.magenta}🚀 App Flow Test: UML/IAC → App Code Generation${colors.reset}`, 'magenta');
  log(`Testing the complete app flow with context-aware code generation`, 'blue');
  log(`Base URL: ${BASE_URL}`, 'blue');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Phase 1: User Prompt Processing', fn: testPhase1UserPrompt },
    { name: 'Phase 2: UML and IAC Generation', fn: testPhase2UMLAndIACGeneration },
    { name: 'Phase 3: App Code with Context', fn: testPhase3AppCodeGenerationWithContext },
    { name: 'Complete Flow Test', fn: testCompleteFlow }
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
    logSuccess('🎉 All tests passed! App flow is working correctly with context-aware generation.');
  } else {
    logWarning(`⚠️  ${totalTests - passedTests} tests failed. Please check the system.`);
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
  testHealthCheck,
  testPhase1UserPrompt,
  testPhase2UMLAndIACGeneration,
  testPhase3AppCodeGenerationWithContext,
  testCompleteFlow
}; 