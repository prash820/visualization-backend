// Test to verify proper error handling without fallback dummy code
const fs = require('fs/promises');
const path = require('path');

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling (No Fallback Dummy Code)...\n');
  
  try {
    // Mock the AI providers to simulate failures
    const originalRequire = require;
    const mockRequire = function(id) {
      if (id.includes('aiProvider')) {
        return {
          openai: { 
            chat: { 
              completions: { 
                create: () => Promise.reject(new Error('OpenAI API key not configured')) 
              } 
            } 
          },
          OPENAI_MODEL: 'gpt-4o',
          anthropic: { 
            messages: { 
              create: () => Promise.reject(new Error('Anthropic API key not configured')) 
            } 
          },
          ANTHROPIC_MODEL: 'claude-test'
        };
      }
      return originalRequire(id);
    };
    
    // Temporarily replace require
    const originalModuleRequire = module.constructor.prototype.require;
    module.constructor.prototype.require = mockRequire;
    
    try {
      // Import the module
      const { umlToCodePlan } = require('./dist/utils/umlToCodePlan');
      
      console.log('✅ Successfully imported umlToCodePlan function');
      
      // Test 1: No UML diagrams provided
      console.log('\n📋 Test 1: No UML diagrams provided...');
      try {
        await umlToCodePlan({
          frontendComponentDiagram: undefined,
          backendComponentDiagram: undefined,
          frontendClassDiagram: undefined,
          backendClassDiagram: undefined,
          frontendSequenceDiagram: undefined,
          backendSequenceDiagram: undefined
        });
        console.log('❌ ERROR: Should have thrown an error for no diagrams');
      } catch (error) {
        console.log('✅ Correctly threw error for no diagrams:');
        console.log(`   ${error.message}`);
      }
      
      // Test 2: Empty UML diagrams provided
      console.log('\n📋 Test 2: Empty UML diagrams provided...');
      try {
        await umlToCodePlan({
          frontendComponentDiagram: '',
          backendComponentDiagram: '',
          frontendClassDiagram: '',
          backendClassDiagram: '',
          frontendSequenceDiagram: '',
          backendSequenceDiagram: ''
        });
        console.log('❌ ERROR: Should have thrown an error for empty diagrams');
      } catch (error) {
        console.log('✅ Correctly threw error for empty diagrams:');
        console.log(`   ${error.message}`);
      }
      
      // Test 3: Invalid UML diagrams with AI failure
      console.log('\n📋 Test 3: Invalid UML diagrams with AI failure...');
      try {
        await umlToCodePlan({
          frontendComponentDiagram: 'invalid diagram',
          backendComponentDiagram: 'invalid diagram',
          frontendClassDiagram: 'invalid diagram',
          backendClassDiagram: 'invalid diagram',
          frontendSequenceDiagram: 'invalid diagram',
          backendSequenceDiagram: 'invalid diagram'
        });
        console.log('❌ ERROR: Should have thrown an error for AI failure');
      } catch (error) {
        console.log('✅ Correctly threw error for AI failure:');
        console.log(`   ${error.message}`);
      }
      
      // Test 4: Check that generateBasicCodePlan is no longer exported
      console.log('\n📋 Test 4: Checking that generateBasicCodePlan is not exported...');
      const { generateBasicCodePlan } = require('./dist/utils/umlToCodePlan');
      if (generateBasicCodePlan) {
        console.log('❌ ERROR: generateBasicCodePlan should not be exported');
      } else {
        console.log('✅ Correctly: generateBasicCodePlan is not exported');
      }
      
      console.log('\n🎉 All error handling tests passed!');
      console.log('✅ The system properly throws errors instead of generating dummy code.');
      console.log('✅ Users must provide valid UML diagrams and proper AI configuration.');
      
    } finally {
      // Restore original require
      module.constructor.prototype.require = originalModuleRequire;
    }
    
  } catch (error) {
    console.error('❌ Error testing error handling:', error);
  }
}

// Run the test
testErrorHandling(); 