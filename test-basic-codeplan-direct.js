// Direct test of generateBasicCodePlan function
const fs = require('fs/promises');
const path = require('path');

async function testBasicCodePlanDirect() {
  console.log('🧪 Testing Basic CodePlan Generation (Direct)...\n');
  
  try {
    // Mock the AI provider to avoid initialization errors
    const originalRequire = require;
    const mockRequire = function(id) {
      if (id.includes('aiProvider')) {
        return {
          anthropic: { messages: { create: () => Promise.reject(new Error('AI not available')) } },
          ANTHROPIC_MODEL: 'claude-test'
        };
      }
      return originalRequire(id);
    };
    
    // Temporarily replace require
    const originalModuleRequire = module.constructor.prototype.require;
    module.constructor.prototype.require = mockRequire;
    
    try {
      // Now import the module
      const { generateBasicCodePlan } = require('./dist/utils/umlToCodePlan');
      
      console.log('✅ Successfully imported generateBasicCodePlan function');
      
      // Test the basic CodePlan generation
      console.log('\n📋 Testing basic CodePlan generation...');
      const basicCodePlan = generateBasicCodePlan();
      
      console.log('✅ Basic CodePlan generated successfully!');
      console.log(`📊 Frontend components: ${basicCodePlan.frontendComponents.length}`);
      console.log(`📊 Backend components: ${basicCodePlan.backendComponents.length}`);
      console.log(`📊 Frontend files: ${basicCodePlan.fileStructure.frontend.length}`);
      console.log(`📊 Backend files: ${basicCodePlan.fileStructure.backend.length}`);
      
      // Verify structure
      console.log('\n📁 Frontend Components:');
      basicCodePlan.frontendComponents.forEach(comp => {
        console.log(`  - ${comp.name}: ${comp.children.join(', ')}`);
      });
      
      console.log('\n📁 Backend Components:');
      basicCodePlan.backendComponents.forEach(comp => {
        console.log(`  - ${comp.name}: ${comp.children.join(', ')}`);
      });
      
      console.log('\n📁 Frontend Files:');
      basicCodePlan.fileStructure.frontend.forEach(file => {
        console.log(`  - ${file.path} (type: ${file.type})`);
      });
      
      console.log('\n📁 Backend Files:');
      basicCodePlan.fileStructure.backend.forEach(file => {
        console.log(`  - ${file.path} (type: ${file.type})`);
      });
      
      // Verify all files have type field
      const frontendFilesWithType = basicCodePlan.fileStructure.frontend.filter(f => f.type === 'frontend');
      const backendFilesWithType = basicCodePlan.fileStructure.backend.filter(f => f.type === 'backend');
      
      console.log(`\n✅ Frontend files with type: ${frontendFilesWithType.length}/${basicCodePlan.fileStructure.frontend.length}`);
      console.log(`✅ Backend files with type: ${backendFilesWithType.length}/${basicCodePlan.fileStructure.backend.length}`);
      
      // Check for essential files
      const hasFrontendIndex = basicCodePlan.fileStructure.frontend.some(f => f.path.includes('index.tsx'));
      const hasBackendIndex = basicCodePlan.fileStructure.backend.some(f => f.path.includes('index.ts'));
      const hasPublicHtml = basicCodePlan.fileStructure.frontend.some(f => f.path.includes('index.html'));
      
      console.log(`\n✅ Has frontend index.tsx: ${hasFrontendIndex}`);
      console.log(`✅ Has backend index.ts: ${hasBackendIndex}`);
      console.log(`✅ Has public index.html: ${hasPublicHtml}`);
      
      // Verify the CodePlan structure is complete
      const hasComponents = basicCodePlan.frontendComponents.length > 0 && basicCodePlan.backendComponents.length > 0;
      const hasModels = basicCodePlan.frontendModels.length > 0 && basicCodePlan.backendModels.length > 0;
      const hasDependencies = basicCodePlan.frontendDependencies.length > 0 && basicCodePlan.backendDependencies.length > 0;
      const hasFiles = basicCodePlan.fileStructure.frontend.length > 0 && basicCodePlan.fileStructure.backend.length > 0;
      const hasIntegration = basicCodePlan.integration && basicCodePlan.integration.apiEndpoints.length > 0;
      
      console.log(`\n📊 CodePlan Completeness Check:`);
      console.log(`  ✅ Has components: ${hasComponents}`);
      console.log(`  ✅ Has models: ${hasModels}`);
      console.log(`  ✅ Has dependencies: ${hasDependencies}`);
      console.log(`  ✅ Has files: ${hasFiles}`);
      console.log(`  ✅ Has integration: ${hasIntegration}`);
      
      const allComplete = hasComponents && hasModels && hasDependencies && hasFiles && hasIntegration;
      console.log(`\n🎯 CodePlan is complete: ${allComplete}`);
      
      if (allComplete) {
        console.log('\n🎉 Basic CodePlan generation test passed!');
        console.log('✅ The generateBasicCodePlan function generates a complete, usable CodePlan structure.');
      } else {
        console.log('\n⚠️ Basic CodePlan generation test partially passed');
        console.log('⚠️ Some parts of the CodePlan are missing or incomplete.');
      }
      
    } finally {
      // Restore original require
      module.constructor.prototype.require = originalModuleRequire;
    }
    
  } catch (error) {
    console.error('❌ Error testing basic CodePlan generation:', error);
  }
}

// Run the test
testBasicCodePlanDirect(); 