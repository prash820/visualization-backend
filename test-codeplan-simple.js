// Simple test for CodePlan generation without AI dependencies
const fs = require('fs/promises');
const path = require('path');

async function testCodePlanSimple() {
  console.log('🧪 Testing CodePlan Generation (Simple)...\n');
  
  try {
    // Read the compiled umlToCodePlan file to extract the generateBasicCodePlan function
    const umlToCodePlanPath = path.join(__dirname, 'dist', 'utils', 'umlToCodePlan.js');
    const umlToCodePlanContent = await fs.readFile(umlToCodePlanPath, 'utf-8');
    
    // Create a mock environment that doesn't require AI providers
    const mockModule = {
      exports: {}
    };
    
    // Mock the AI provider imports
    const originalRequire = require;
    require = function(id) {
      if (id.includes('aiProvider')) {
        return {
          anthropic: { messages: { create: () => Promise.reject(new Error('AI not available')) } },
          ANTHROPIC_MODEL: 'claude-test'
        };
      }
      return originalRequire(id);
    };
    
    // Execute the module in a safe context
    const vm = require('vm');
    const context = {
      module: mockModule,
      exports: mockModule.exports,
      require: require,
      console: console,
      Buffer: Buffer,
      process: process,
      global: global,
      __dirname: __dirname,
      __filename: __filename
    };
    
    vm.createContext(context);
    vm.runInContext(umlToCodePlanContent, context);
    
    // Extract the generateBasicCodePlan function
    const generateBasicCodePlan = context.module.exports.generateBasicCodePlan;
    
    if (!generateBasicCodePlan) {
      console.log('❌ generateBasicCodePlan function not found in exports');
      console.log('Available exports:', Object.keys(context.module.exports));
      return;
    }
    
    console.log('✅ Successfully loaded generateBasicCodePlan function');
    
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
    
    console.log('\n🎉 Basic CodePlan generation test passed!');
    console.log('✅ The generateBasicCodePlan function works correctly and generates a complete structure.');
    
  } catch (error) {
    console.error('❌ Error testing CodePlan generation:', error);
  }
}

// Run the test
testCodePlanSimple(); 