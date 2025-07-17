// Test script for enhanced UML generator
// Run with: npx ts-node test-uml-generator.js

const { generateUmlFromPrompt, getDiagramSummary, extractComponentsFromDiagrams } = require('./dist/utils/umlGenerator');

async function testUMLGenerator() {
  console.log('Testing enhanced UML generator...\n');
  
  const testPrompt = "Create a task management app for freelancers with user authentication, project management, time tracking, and invoicing features. Use React for frontend and Node.js/Express for backend with MongoDB database.";
  
  try {
    console.log('Generating comprehensive UML diagrams...');
    const diagrams = await generateUmlFromPrompt(testPrompt);
    
    console.log('\n=== Generated Diagrams ===');
    console.log('Available diagrams:', Object.keys(diagrams).filter(key => diagrams[key]));
    
    console.log('\n=== Diagram Summary ===');
    const summary = getDiagramSummary(diagrams);
    console.log('Has frontend diagrams:', summary.hasFrontendDiagrams);
    console.log('Has backend diagrams:', summary.hasBackendDiagrams);
    console.log('Has architecture diagrams:', summary.hasArchitectureDiagrams);
    console.log('Total diagram count:', summary.diagramCount);
    console.log('Available diagrams:', summary.availableDiagrams);
    
    console.log('\n=== Extracted Components ===');
    const components = extractComponentsFromDiagrams(diagrams);
    console.log('Frontend components:', components.frontendComponents);
    console.log('Backend components:', components.backendComponents);
    console.log('System components:', components.systemComponents);
    console.log('Integration points:', components.integrationPoints);
    
    console.log('\n=== Sample Diagram Content ===');
    if (diagrams.architecture) {
      console.log('Architecture diagram (first 200 chars):', diagrams.architecture.substring(0, 200) + '...');
    }
    if (diagrams.frontendComponent) {
      console.log('Frontend component diagram (first 200 chars):', diagrams.frontendComponent.substring(0, 200) + '...');
    }
    if (diagrams.backendComponent) {
      console.log('Backend component diagram (first 200 chars):', diagrams.backendComponent.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Error testing UML generator:', error);
  }
}

testUMLGenerator(); 