const { CodeGenerationEngine } = require('./dist/services/codeGenerationEngine');
const { loadUmlDiagrams } = require('./dist/utils/umlUtils');

async function debugCodeGeneration() {
  console.log('🔍 Debugging Code Generation Engine...\n');

  try {
    // Step 1: Load UML diagrams
    console.log('1. Loading UML diagrams...');
    const umlDiagrams = await loadUmlDiagrams('52f33c5f-0e08-4cde-bb62-3e6eb44f6cd5');
    console.log('✅ UML diagrams loaded:', Object.keys(umlDiagrams));
    console.log('');

    // Step 2: Create engine
    console.log('2. Creating Code Generation Engine...');
    const projectPath = '/Users/prashanthboovaragavan/Documents/workspace/chart-app-fullstack/visualization-backend/generated-projects/52f33c5f-0e08-4cde-bb62-3e6eb44f6cd5';
    const infrastructureContext = {
      lambdaFunctionUrl: 'arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:413486338132:function:notes-search-furon2/invocations',
      s3BucketName: 'notes-web-furon2'
    };
    
    const engine = new CodeGenerationEngine(projectPath, infrastructureContext);
    console.log('✅ Engine created');
    console.log('');

    // Step 3: Generate application
    console.log('3. Generating application...');
    const result = await engine.generateApplication(umlDiagrams);
    console.log('✅ Generation result:', result);
    console.log('');

    // Step 4: Check if files were actually written
    console.log('4. Checking generated files...');
    const fs = require('fs/promises');
    const path = require('path');
    
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      console.log('Files in project directory:', entries.map(e => e.name));
      
      const srcPath = path.join(projectPath, 'src');
      if (await fs.access(srcPath).then(() => true).catch(() => false)) {
        const srcEntries = await fs.readdir(srcPath, { withFileTypes: true });
        console.log('Files in src directory:', srcEntries.map(e => e.name));
      }
    } catch (error) {
      console.error('Error reading project directory:', error);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCodeGeneration(); 