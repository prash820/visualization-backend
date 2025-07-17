const { buildFixService } = require('./dist/services/buildFixService');
const path = require('path');

async function testImprovedBuildFixService() {
  console.log('🧪 Testing Improved Build Fix Service...');
  
  // Use the existing generated project
  const projectPath = path.join(__dirname, 'generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e');
  const jobId = 'test-improved-' + Date.now();
  
  console.log(`📁 Project path: ${projectPath}`);
  console.log(`🆔 Job ID: ${jobId}`);
  
  try {
    console.log('🔧 Running improved build and fix pipeline...');
    const result = await buildFixService.runBuildAndFixPipeline(projectPath, jobId);
    
    console.log('\n📊 Build Fix Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔄 Retry Count: ${result.retryCount}`);
    console.log(`🔧 Files Fixed: ${result.fixedFiles.length}`);
    console.log(`❌ Remaining Errors: ${result.errors.length}`);
    console.log(`⚠️ Warnings: ${result.warnings.length}`);
    
    if (result.fixedFiles.length > 0) {
      console.log('\n📝 Fixed Files:');
      result.fixedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Detected Errors:');
      result.errors.forEach(error => {
        console.log(`  - ${error.type}: ${error.message}`);
        if (error.file) console.log(`    File: ${error.file}:${error.line || '?'}`);
        if (error.code) console.log(`    Code: ${error.code}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning.type}: ${warning.message}`);
      });
    }
    
    console.log('\n📋 Build Logs (last 20 lines):');
    const lastLogs = result.logs.slice(-20);
    lastLogs.forEach(log => console.log(`  ${log}`));
    
    // Summary
    console.log('\n🎯 Summary:');
    if (result.success) {
      console.log('✅ Build fix pipeline completed successfully!');
    } else {
      console.log('❌ Build fix pipeline found errors that need attention');
      console.log(`   - Total errors: ${result.errors.length}`);
      console.log(`   - Files fixed: ${result.fixedFiles.length}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testImprovedBuildFixService().catch(console.error); 