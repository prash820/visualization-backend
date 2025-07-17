// Test script for enhanced system with all 6 diagrams
const { generateUmlFromPrompt } = require('./dist/utils/umlGenerator');
const { umlToCodePlan } = require('./dist/utils/umlToCodePlan');

async function testEnhancedSystem() {
  console.log('🧪 Testing Enhanced System with All 6 Diagrams\n');
  
  const testPrompt = "Create a simple calculator app with user authentication and history tracking";
  
  try {
    console.log('1. Generating comprehensive UML diagrams...');
    const diagrams = await generateUmlFromPrompt(testPrompt);
    
    console.log('\n=== Generated Diagrams ===');
    const availableDiagrams = Object.keys(diagrams).filter(key => diagrams[key]);
    console.log('Available diagrams:', availableDiagrams);
    console.log('Total diagrams:', availableDiagrams.length);
    
    // Check for the 6 key diagrams we need
    const requiredDiagrams = [
      'frontendComponent', 'backendComponent',
      'frontendClass', 'backendClass', 
      'frontendSequence', 'backendSequence'
    ];
    
    const missingDiagrams = requiredDiagrams.filter(diagram => !diagrams[diagram]);
    if (missingDiagrams.length > 0) {
      console.log('❌ Missing diagrams:', missingDiagrams);
    } else {
      console.log('✅ All 6 required diagrams generated!');
    }
    
    console.log('\n2. Testing enhanced CodePlan generation...');
    const codePlan = await umlToCodePlan({
      frontendComponentDiagram: diagrams.frontendComponent,
      backendComponentDiagram: diagrams.backendComponent,
      frontendClassDiagram: diagrams.frontendClass,
      backendClassDiagram: diagrams.backendClass,
      frontendSequenceDiagram: diagrams.frontendSequence,
      backendSequenceDiagram: diagrams.backendSequence
    });
    
    console.log('\n=== Enhanced CodePlan Analysis ===');
    console.log('Frontend Components:', codePlan.frontendComponents.length);
    console.log('Backend Components:', codePlan.backendComponents.length);
    console.log('Frontend Models:', codePlan.frontendModels.length);
    console.log('Backend Models:', codePlan.backendModels.length);
    console.log('Frontend Dependencies:', codePlan.frontendDependencies.length);
    console.log('Backend Dependencies:', codePlan.backendDependencies.length);
    console.log('Integration API Endpoints:', codePlan.integration?.apiEndpoints?.length || 0);
    console.log('Integration Data Flows:', codePlan.integration?.dataFlow?.length || 0);
    
    // Show sample data
    if (codePlan.frontendComponents.length > 0) {
      console.log('\nSample Frontend Component:', codePlan.frontendComponents[0]);
    }
    
    if (codePlan.backendComponents.length > 0) {
      console.log('\nSample Backend Component:', codePlan.backendComponents[0]);
    }
    
    if (codePlan.integration?.apiEndpoints?.length > 0) {
      console.log('\nSample API Endpoint:', codePlan.integration.apiEndpoints[0]);
    }
    
    console.log('\n✅ Enhanced system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing enhanced system:', error);
  }
}

// Run the test
testEnhancedSystem(); 