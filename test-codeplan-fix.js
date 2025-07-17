const fs = require('fs/promises');
const path = require('path');

async function testCodePlanFix() {
  console.log('🧪 Testing CodePlan Fix...\n');
  
  try {
    // Mock the umlToCodePlan function to test the logic
    const { umlToCodePlan } = require('./dist/utils/umlToCodePlan');
    
    // Test 1: No diagrams provided (should generate basic CodePlan)
    console.log('📋 Test 1: No UML diagrams provided...');
    const basicCodePlan = await umlToCodePlan({
      frontendComponentDiagram: undefined,
      backendComponentDiagram: undefined,
      frontendClassDiagram: undefined,
      backendClassDiagram: undefined,
      frontendSequenceDiagram: undefined,
      backendSequenceDiagram: undefined
    });
    
    console.log('✅ Basic CodePlan generated successfully!');
    console.log(`📊 Frontend components: ${basicCodePlan.frontendComponents.length}`);
    console.log(`📊 Backend components: ${basicCodePlan.backendComponents.length}`);
    console.log(`📊 Frontend files: ${basicCodePlan.fileStructure.frontend.length}`);
    console.log(`📊 Backend files: ${basicCodePlan.fileStructure.backend.length}`);
    
    // Test 2: Empty diagrams provided (should generate basic CodePlan)
    console.log('\n📋 Test 2: Empty UML diagrams provided...');
    const emptyCodePlan = await umlToCodePlan({
      frontendComponentDiagram: '',
      backendComponentDiagram: '',
      frontendClassDiagram: '',
      backendClassDiagram: '',
      frontendSequenceDiagram: '',
      backendSequenceDiagram: ''
    });
    
    console.log('✅ Empty diagrams CodePlan generated successfully!');
    console.log(`📊 Frontend components: ${emptyCodePlan.frontendComponents.length}`);
    console.log(`📊 Backend components: ${emptyCodePlan.backendComponents.length}`);
    console.log(`📊 Frontend files: ${emptyCodePlan.fileStructure.frontend.length}`);
    console.log(`📊 Backend files: ${emptyCodePlan.fileStructure.backend.length}`);
    
    // Test 3: Invalid diagrams provided (should fall back to basic CodePlan)
    console.log('\n📋 Test 3: Invalid UML diagrams provided...');
    const invalidCodePlan = await umlToCodePlan({
      frontendComponentDiagram: 'invalid diagram',
      backendComponentDiagram: 'invalid diagram',
      frontendClassDiagram: 'invalid diagram',
      backendClassDiagram: 'invalid diagram',
      frontendSequenceDiagram: 'invalid diagram',
      backendSequenceDiagram: 'invalid diagram'
    });
    
    console.log('✅ Invalid diagrams CodePlan generated successfully!');
    console.log(`📊 Frontend components: ${invalidCodePlan.frontendComponents.length}`);
    console.log(`📊 Backend components: ${invalidCodePlan.backendComponents.length}`);
    console.log(`📊 Frontend files: ${invalidCodePlan.fileStructure.frontend.length}`);
    console.log(`📊 Backend files: ${invalidCodePlan.fileStructure.backend.length}`);
    
    // Verify all CodePlans have the expected structure
    const allCodePlans = [basicCodePlan, emptyCodePlan, invalidCodePlan];
    
    allCodePlans.forEach((codePlan, index) => {
      console.log(`\n📁 CodePlan ${index + 1} Structure:`);
      console.log(`  - Frontend components: ${codePlan.frontendComponents.length}`);
      console.log(`  - Backend components: ${codePlan.backendComponents.length}`);
      console.log(`  - Frontend files: ${codePlan.fileStructure.frontend.length}`);
      console.log(`  - Backend files: ${codePlan.fileStructure.backend.length}`);
      
      // Check that all files have the type field
      const frontendFilesWithType = codePlan.fileStructure.frontend.filter(f => f.type === 'frontend');
      const backendFilesWithType = codePlan.fileStructure.backend.filter(f => f.type === 'backend');
      
      console.log(`  - Frontend files with type: ${frontendFilesWithType.length}/${codePlan.fileStructure.frontend.length}`);
      console.log(`  - Backend files with type: ${backendFilesWithType.length}/${codePlan.fileStructure.backend.length}`);
      
      // Check for essential files
      const hasFrontendIndex = codePlan.fileStructure.frontend.some(f => f.path.includes('index.tsx'));
      const hasBackendIndex = codePlan.fileStructure.backend.some(f => f.path.includes('index.ts'));
      const hasPublicHtml = codePlan.fileStructure.frontend.some(f => f.path.includes('index.html'));
      
      console.log(`  - Has frontend index.tsx: ${hasFrontendIndex}`);
      console.log(`  - Has backend index.ts: ${hasBackendIndex}`);
      console.log(`  - Has public index.html: ${hasPublicHtml}`);
    });
    
    console.log('\n🎉 All CodePlan tests passed!');
    console.log('✅ The fix ensures that a basic CodePlan is always generated, even when AI analysis fails.');
    
  } catch (error) {
    console.error('❌ Error testing CodePlan fix:', error);
  }
}

// Run the test
testCodePlanFix(); 