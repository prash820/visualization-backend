require('dotenv').config();
const { buildFixService } = require('./dist/services/buildFixService');

async function testBuildFixDetailed() {
  console.log('🧪 Testing build/fix pipeline with detailed logging...');
  
  const projectPath = './generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e';
  const jobId = 'test-build-fix-detailed';
  
  try {
    console.log(`📁 Testing project: ${projectPath}`);
    console.log(`🆔 Job ID: ${jobId}`);
    
    const result = await buildFixService.runBuildAndFixPipeline(projectPath, jobId);
    
    console.log('\n📊 BUILD/FIX RESULT:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔄 Retry Count: ${result.retryCount}`);
    console.log(`📝 Fixed Files: ${result.fixedFiles.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    console.log(`⚠️ Warnings: ${result.warnings.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.type}] ${error.file || 'Global'}: ${error.message}`);
      });
    }
    
    if (result.fixedFiles.length > 0) {
      console.log('\n✅ FIXED FILES:');
      result.fixedFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    }
    
    console.log('\n📋 LOGS:');
    result.logs.forEach((log, index) => {
      if (log.includes('[BuildFix]')) {
        console.log(`  ${index + 1}. ${log}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBuildFixDetailed(); 