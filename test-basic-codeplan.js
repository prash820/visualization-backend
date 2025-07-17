const { umlToCodePlan } = require('./dist/utils/umlToCodePlan');

async function testBasicCodePlan() {
  console.log('🧪 Testing Basic CodePlan Generation...\n');
  
  try {
    // Test with no UML diagrams (should generate basic CodePlan)
    console.log('📋 Testing with no UML diagrams...');
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
    
    console.log(`\n✅ Frontend files with correct type: ${frontendFilesWithType.length}/${basicCodePlan.fileStructure.frontend.length}`);
    console.log(`✅ Backend files with correct type: ${backendFilesWithType.length}/${basicCodePlan.fileStructure.backend.length}`);
    
    if (frontendFilesWithType.length === basicCodePlan.fileStructure.frontend.length &&
        backendFilesWithType.length === basicCodePlan.fileStructure.backend.length) {
      console.log('🎉 All files have correct type field!');
    } else {
      console.log('⚠️  Some files are missing type field');
    }
    
    // Test with empty strings (should also generate basic CodePlan)
    console.log('\n📋 Testing with empty UML diagrams...');
    const emptyCodePlan = await umlToCodePlan({
      frontendComponentDiagram: '',
      backendComponentDiagram: '',
      frontendClassDiagram: '',
      backendClassDiagram: '',
      frontendSequenceDiagram: '',
      backendSequenceDiagram: ''
    });
    
    console.log('✅ Empty diagrams CodePlan generated successfully!');
    console.log(`📊 Frontend files: ${emptyCodePlan.fileStructure.frontend.length}`);
    console.log(`📊 Backend files: ${emptyCodePlan.fileStructure.backend.length}`);
    
    console.log('\n🎉 Basic CodePlan generation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing basic CodePlan generation:', error);
  }
}

// Run the test
testBasicCodePlan(); 