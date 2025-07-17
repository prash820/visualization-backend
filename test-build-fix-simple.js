// Simple test to verify build fix service error detection and AI fixing
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

async function testErrorDetection() {
  console.log('🧪 Testing Error Detection and AI Fixing in Build Fix Service...\n');
  
  const projectPath = path.join(__dirname, 'generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e');
  const frontendPath = path.join(projectPath, 'frontend');
  
  console.log(`📁 Testing frontend: ${frontendPath}\n`);
  
  try {
    // Import the build fix service
    console.log('🔍 Importing build fix service...');
    const { buildFixService } = require('./dist/services/buildFixService');
    
    // Test the full build fix pipeline
    console.log('🔄 Testing full build fix pipeline...');
    const buildResult = await buildFixService.runBuildAndFixPipeline(projectPath, 'test-simple');
    
    console.log('\n📊 Build Fix Results:');
    console.log(`✅ Success: ${buildResult.success}`);
    console.log(`🔄 Retry Count: ${buildResult.retryCount}`);
    console.log(`🔧 Files Fixed: ${buildResult.fixedFiles.length}`);
    console.log(`❌ Remaining Errors: ${buildResult.errors.length}`);
    console.log(`⚠️ Warnings: ${buildResult.warnings.length}`);
    
    if (buildResult.fixedFiles.length > 0) {
      console.log('\n📝 Fixed Files:');
      buildResult.fixedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (buildResult.errors.length > 0) {
      console.log('\n❌ Remaining Errors:');
      buildResult.errors.slice(0, 10).forEach(error => {
        console.log(`  - ${error.type}: ${error.message}`);
        if (error.file) console.log(`    File: ${error.file}:${error.line || '?'}`);
      });
      
      if (buildResult.errors.length > 10) {
        console.log(`  ... and ${buildResult.errors.length - 10} more errors`);
      }
    }
    
    // Show some logs
    if (buildResult.logs.length > 0) {
      console.log('\n📋 Recent Logs:');
      buildResult.logs.slice(-20).forEach(log => {
        console.log(`  ${log}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

testErrorDetection().catch(console.error); 