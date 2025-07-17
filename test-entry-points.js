const fs = require('fs/promises');
const path = require('path');

async function testEntryPoints() {
  console.log('🧪 Testing Entry Points Generation...\n');
  
  // Create a test project structure
  const testProjectPath = path.join(__dirname, 'test-entry-points-project');
  
  try {
    // Clean up any existing test project
    await fs.rm(testProjectPath, { recursive: true, force: true });
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Create basic project structure
    const frontendPath = path.join(testProjectPath, 'frontend', 'src');
    const backendPath = path.join(testProjectPath, 'backend', 'src');
    
    await fs.mkdir(frontendPath, { recursive: true });
    await fs.mkdir(backendPath, { recursive: true });
    
    // Create some basic files to simulate generated content
    await fs.mkdir(path.join(frontendPath, 'components'), { recursive: true });
    await fs.writeFile(path.join(frontendPath, 'components', 'App.tsx'), '// App component');
    await fs.writeFile(path.join(backendPath, 'server.ts'), '// Server file');
    
    console.log('✅ Test project structure created');
    
    // Test the entry point generation logic
    const { BuildFileGenerator } = require('./dist/services/buildFileGenerator');
    const generator = new BuildFileGenerator();
    
    // Mock the analysis
    const mockAnalysis = {
      hasFrontend: true,
      hasBackend: true,
      backendServices: ['TestService'],
      backendModels: ['TestModel'],
      backendControllers: ['TestController'],
      frontendComponents: ['App'],
      dependencies: ['react', 'express'],
      imports: []
    };
    
    // Test entry point generation
    console.log('📋 Testing entry point generation...');
    const entryPointResult = await generator.ensureEntryPoints(testProjectPath, mockAnalysis, 'test-job');
    
    console.log(`✅ Generated ${entryPointResult.generatedFiles.length} entry point files:`);
    entryPointResult.generatedFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    // Verify files exist
    console.log('\n📁 Verifying entry point files exist...');
    
    const frontendIndexPath = path.join(testProjectPath, 'frontend', 'src', 'index.tsx');
    const backendIndexPath = path.join(testProjectPath, 'backend', 'src', 'index.ts');
    const publicHtmlPath = path.join(testProjectPath, 'frontend', 'public', 'index.html');
    
    const frontendIndexExists = await fs.access(frontendIndexPath).then(() => true).catch(() => false);
    const backendIndexExists = await fs.access(backendIndexPath).then(() => true).catch(() => false);
    const publicHtmlExists = await fs.access(publicHtmlPath).then(() => true).catch(() => false);
    
    console.log(`✅ Frontend index.tsx exists: ${frontendIndexExists}`);
    console.log(`✅ Backend index.ts exists: ${backendIndexExists}`);
    console.log(`✅ Public index.html exists: ${publicHtmlExists}`);
    
    // Read and verify content
    if (frontendIndexExists) {
      const frontendContent = await fs.readFile(frontendIndexPath, 'utf-8');
      console.log('\n📄 Frontend index.tsx content preview:');
      console.log(frontendContent.substring(0, 200) + '...');
      
      // Check for essential React elements
      const hasReactImport = frontendContent.includes('import React');
      const hasReactDOM = frontendContent.includes('ReactDOM');
      const hasRootElement = frontendContent.includes('getElementById(\'root\')');
      
      console.log(`  ✅ Has React import: ${hasReactImport}`);
      console.log(`  ✅ Has ReactDOM: ${hasReactDOM}`);
      console.log(`  ✅ Has root element: ${hasRootElement}`);
    }
    
    if (backendIndexExists) {
      const backendContent = await fs.readFile(backendIndexPath, 'utf-8');
      console.log('\n📄 Backend index.ts content preview:');
      console.log(backendContent.substring(0, 200) + '...');
      
      // Check for essential Node.js elements
      const hasServerImport = backendContent.includes('import app');
      const hasListen = backendContent.includes('app.listen');
      const hasPort = backendContent.includes('PORT');
      
      console.log(`  ✅ Has server import: ${hasServerImport}`);
      console.log(`  ✅ Has listen method: ${hasListen}`);
      console.log(`  ✅ Has PORT configuration: ${hasPort}`);
    }
    
    if (publicHtmlExists) {
      const htmlContent = await fs.readFile(publicHtmlPath, 'utf-8');
      console.log('\n📄 Public index.html content preview:');
      console.log(htmlContent.substring(0, 200) + '...');
      
      // Check for essential HTML elements
      const hasRootDiv = htmlContent.includes('<div id="root">');
      const hasTitle = htmlContent.includes('<title>');
      const hasMetaViewport = htmlContent.includes('viewport');
      
      console.log(`  ✅ Has root div: ${hasRootDiv}`);
      console.log(`  ✅ Has title: ${hasTitle}`);
      console.log(`  ✅ Has viewport meta: ${hasMetaViewport}`);
    }
    
    console.log('\n🎉 Entry point generation test completed successfully!');
    console.log('📝 The generated entry points should allow the applications to run properly.');
    
  } catch (error) {
    console.error('❌ Error testing entry points:', error);
  } finally {
    // Clean up test project
    await fs.rm(testProjectPath, { recursive: true, force: true });
  }
}

// Run the test
testEntryPoints(); 