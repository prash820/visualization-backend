const { DependencyAwareGenerator } = require('./dist/services/dependencyAwareGenerator');
const fs = require('fs').promises;
const path = require('path');

async function testBackendGeneration() {
  console.log('🧪 Testing Enhanced Dependency-Aware Generation with Backend Components');
  
  const generator = new DependencyAwareGenerator();
  
  // Mock data for testing
  const appAnalysis = {
    appSummary: {
      name: 'FreelanceApp',
      description: 'A freelance management application'
    }
  };
  
  const umlDiagrams = {
    frontendComponent: 'flowchart TB\nA[App] --> B[Component]',
    backendComponent: 'flowchart TB\nA[Controller] --> B[Service]'
  };
  
  const infraCode = `
provider "aws" {
  region = "us-east-1"
}
  `;
  
  const userPrompt = 'Create a freelance management app with user, project, and task management';
  
  try {
    console.log('📋 Starting enhanced dependency-aware generation...');
    
    const result = await generator.generateComponentsInOrder(
      'test-backend-app',
      appAnalysis,
      umlDiagrams,
      infraCode,
      userPrompt
    );
    
    console.log('✅ Generation completed!');
    console.log('📊 Results:');
    console.log(`   - Success: ${result.success}`);
    console.log(`   - Generated files: ${result.generatedFiles.length}`);
    console.log(`   - Errors: ${result.errors.length}`);
    console.log(`   - Warnings: ${result.warnings.length}`);
    
    if (result.generatedFiles.length > 0) {
      console.log('📁 Generated files:');
      result.generatedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      
      // Check if files actually exist and have content
      console.log('\n🔍 Verifying file contents:');
      for (const filePath of result.generatedFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const fileName = path.basename(filePath);
          const relativePath = path.relative(path.join(process.cwd(), 'generated-projects'), filePath);
          console.log(`   ✅ ${fileName} (${relativePath}): ${content.length} characters`);
        } catch (error) {
          console.log(`   ❌ ${path.basename(filePath)}: File not found or empty`);
        }
      }
      
      // Count files by type
      const frontendFiles = result.generatedFiles.filter(f => f.includes('/frontend/'));
      const backendFiles = result.generatedFiles.filter(f => f.includes('/backend/'));
      
      console.log(`\n📊 File Distribution:`);
      console.log(`   - Frontend files: ${frontendFiles.length}`);
      console.log(`   - Backend files: ${backendFiles.length}`);
    }
    
    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBackendGeneration().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 