const { buildFileGenerator } = require('./dist/services/buildFileGenerator');
const path = require('path');
const fs = require('fs');

async function testBuildFileGenerator() {
  console.log('🧪 Testing Build File Generator...');
  
  // Use the existing generated project
  const projectPath = path.join(__dirname, 'generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e');
  const jobId = 'test-build-files-' + Date.now();
  
  console.log(`📁 Project path: ${projectPath}`);
  console.log(`🆔 Job ID: ${jobId}`);
  
  try {
    console.log('🔧 Running build file generation...');
    const result = await buildFileGenerator.generateBuildFiles(projectPath, jobId);
    
    console.log('\n📊 Build File Generation Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📄 Generated Files: ${result.generatedFiles.length}`);
    console.log(`📦 Dependencies: ${result.dependencies.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.generatedFiles.length > 0) {
      console.log('\n📝 Generated Files:');
      result.generatedFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (result.dependencies.length > 0) {
      console.log('\n📦 Dependencies:');
      result.dependencies.forEach(dep => console.log(`  - ${dep}`));
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Check if key files were created
    console.log('\n🔍 Checking key files:');
    const keyFiles = [
      'backend/package.json',
      'backend/tsconfig.json',
      'backend/.eslintrc.js',
      'backend/src/utils/validation.ts',
      'backend/src/utils/integration.ts'
    ];
    
    keyFiles.forEach(file => {
      const fullPath = path.join(projectPath, file);
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${file} exists`);
      } else {
        console.log(`  ❌ ${file} missing`);
      }
    });
    
    // Test TypeScript compilation on the generated backend
    console.log('\n🔍 Testing TypeScript compilation...');
    const backendPath = path.join(projectPath, 'backend');
    if (fs.existsSync(backendPath)) {
      try {
        const { execSync } = require('child_process');
        const tsResult = execSync('npx tsc --noEmit', { 
          cwd: backendPath, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        console.log('✅ TypeScript compilation passed');
      } catch (error) {
        console.log('❌ TypeScript compilation failed:');
        console.log(error.stdout || error.stderr || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBuildFileGenerator().catch(console.error); 