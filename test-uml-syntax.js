// Test script for UML syntax validation
// Run with: node test-uml-syntax.js

const { generateUmlFromPrompt } = require('./dist/utils/umlGenerator');

async function testUMLSyntax() {
  console.log('Testing UML generator syntax...\n');
  
  const testPrompt = "Create a simple calculator app with basic arithmetic operations, scientific functions, and calculation history. Use React for frontend and Node.js/Express for backend with MongoDB database.";
  
  try {
    console.log('Generating UML diagrams with updated syntax...');
    const diagrams = await generateUmlFromPrompt(testPrompt);
    
    console.log('\n=== Generated Diagrams ===');
    console.log('Available diagrams:', Object.keys(diagrams).filter(key => diagrams[key]));
    
    // Test each diagram for syntax
    Object.entries(diagrams).forEach(([key, value]) => {
      console.log(`\n--- ${key.toUpperCase()} DIAGRAM ---`);
      console.log('Syntax check:', value ? '✅ Has content' : '❌ Empty');
      if (value) {
        console.log('First few lines:');
        console.log(value.split('\n').slice(0, 5).join('\n'));
        console.log('...');
      }
    });
    
  } catch (error) {
    console.error('Error testing UML syntax:', error);
  }
}

testUMLSyntax(); 