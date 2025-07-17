const { validateBackendCodeConsistency } = require('./src/utils/codeConsistencyValidator');

async function testConsistencyValidation() {
  console.log('Testing code consistency validation...\n');

  const projectPath = './generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e';

  try {
    console.log('=== Validating Current Generated Code ===');
    const result = await validateBackendCodeConsistency(projectPath);
    
    console.log('Validation Result:');
    console.log(`Success: ${result.success}`);
    console.log(`Issues Found: ${result.issues.length}`);
    console.log('\nSummary:');
    console.log(result.summary);
    
    if (result.issues.length > 0) {
      console.log('\nDetailed Issues:');
      result.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type.toUpperCase()} - ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   ${issue.message}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log('');
      });
    }

    console.log('\n=== Recommendations ===');
    if (!result.success) {
      console.log('❌ The current generated code has consistency issues that need to be fixed.');
      console.log('✅ The improved backend component agent should prevent these issues in future generations.');
      console.log('\nKey improvements in the enhanced agent:');
      console.log('- Better import/export consistency rules');
      console.log('- Method signature matching validation');
      console.log('- Proper error handling patterns');
      console.log('- Lambda-specific requirements');
      console.log('- Enhanced fallback code generation');
    } else {
      console.log('✅ The current generated code passes all consistency checks!');
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

testConsistencyValidation().catch(console.error); 