// Manual test of build fix system with actual generated project
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

// Test the TypeScript error parsing with actual project
async function testBuildFixWithRealProject() {
  console.log('🧪 Testing Build Fix System with Real Generated Project...\n');
  
  const projectPath = path.join(__dirname, 'generated-projects/1ca89a4c-0bcf-46a1-ba25-36e953ddce3e');
  const frontendPath = path.join(projectPath, 'frontend');
  
  console.log(`📁 Project path: ${projectPath}`);
  console.log(`📁 Frontend path: ${frontendPath}\n`);
  
  try {
    // Step 1: Run TypeScript check manually
    console.log('🔍 Step 1: Running TypeScript check...');
    const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: frontendPath });
    
    // TypeScript errors are in stderr, not stdout
    const output = stderr || stdout;
    
    if (output && output.trim()) {
      console.log('✅ TypeScript errors detected:');
      console.log(output);
      
      // Step 2: Test our error parsing
      console.log('\n🔍 Step 2: Testing error parsing...');
      const parsedErrors = parseTypeScriptErrors(output);
      
      console.log(`📊 Parsed ${parsedErrors.length} errors`);
      
      if (parsedErrors.length > 0) {
        console.log('\n📝 Sample parsed errors:');
        parsedErrors.slice(0, 5).forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.file}:${error.line}:${error.column} - ${error.message} (${error.code || 'TS'})`);
        });
        
        if (parsedErrors.length > 5) {
          console.log(`  ... and ${parsedErrors.length - 5} more errors`);
        }
      }
      
      // Step 3: Test build fix service (if available)
      console.log('\n🔍 Step 3: Testing build fix service...');
      try {
        // Try to import the build fix service
        const { buildFixService } = require('./src/services/buildFixService');
        
        console.log('✅ Build fix service imported successfully');
        console.log('🔄 Running build and fix pipeline...');
        
        const result = await buildFixService.runBuildAndFixPipeline(projectPath, 'test-job-manual');
        
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
          console.log('\n❌ Remaining Errors:');
          result.errors.forEach(error => {
            console.log(`  - ${error.type}: ${error.message}`);
            if (error.file) console.log(`    File: ${error.file}:${error.line || '?'}`);
          });
        }
        
      } catch (importError) {
        console.log('⚠️ Could not import build fix service:', importError.message);
        console.log('💡 Try running: npm run build');
      }
      
    } else {
      console.log('✅ No TypeScript errors found');
    }
    
  } catch (error) {
    // TypeScript command failed, which means there are errors
    console.log('✅ TypeScript errors detected (command failed):');
    console.log(error.stderr || error.message);
    
    if (error.stderr) {
      // Step 2: Test our error parsing
      console.log('\n🔍 Step 2: Testing error parsing...');
      const parsedErrors = parseTypeScriptErrors(error.stderr);
      
      console.log(`📊 Parsed ${parsedErrors.length} errors`);
      
      if (parsedErrors.length > 0) {
        console.log('\n📝 Sample parsed errors:');
        parsedErrors.slice(0, 5).forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.file}:${error.line}:${error.column} - ${error.message} (${error.code || 'TS'})`);
        });
        
        if (parsedErrors.length > 5) {
          console.log(`  ... and ${parsedErrors.length - 5} more errors`);
        }
      }
      
      // Step 3: Test build fix service (if available)
      console.log('\n🔍 Step 3: Testing build fix service...');
      try {
        // Try to import the build fix service
        const { buildFixService } = require('./src/services/buildFixService');
        
        console.log('✅ Build fix service imported successfully');
        console.log('🔄 Running build and fix pipeline...');
        
        const result = await buildFixService.runBuildAndFixPipeline(projectPath, 'test-job-manual');
        
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
          console.log('\n❌ Remaining Errors:');
          result.errors.forEach(error => {
            console.log(`  - ${error.type}: ${error.message}`);
            if (error.file) console.log(`    File: ${error.file}:${error.line || '?'}`);
          });
        }
        
      } catch (importError) {
        console.log('⚠️ Could not import build fix service:', importError.message);
        console.log('💡 Try running: npm run build');
      }
    }
  }
}

// Copy the error parsing function from buildFixService
function parseTypeScriptErrors(logText) {
  const errors = [];
  const seenErrors = new Set();
  
  const addError = (error) => {
    const key = `${error.file}:${error.line}:${error.column}:${error.message}`;
    if (!seenErrors.has(key)) {
      seenErrors.add(key);
      errors.push(error);
    }
  };
  
  // Pattern 1: Standard TypeScript errors with file:line:column format
  const tsErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS\d+:\s+(.+)/g;
  let match;

  while ((match = tsErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim()
    });
  }

  // Pattern 10: Declaration or statement expected errors (TS1128)
  const declarationErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1128:\s+(.+)/g;
  while ((match = declarationErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1128'
    });
  }

  // Pattern 11: Expression expected errors (TS1109)
  const expressionErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1109:\s+(.+)/g;
  while ((match = expressionErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1109'
    });
  }

  // Pattern 12: Identifier expected errors (TS1003)
  const identifierErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1003:\s+(.+)/g;
  while ((match = identifierErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1003'
    });
  }

  // Pattern 13: Semicolon expected errors (TS1005)
  const semicolonErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1005:\s+(.+)/g;
  while ((match = semicolonErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1005'
    });
  }

  // Pattern 14: Unexpected keyword or identifier errors (TS1434)
  const unexpectedKeywordErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1434:\s+(.+)/g;
  while ((match = unexpectedKeywordErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1434'
    });
  }

  // Pattern 15: Unknown keyword or identifier errors (TS1435)
  const unknownKeywordErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1435:\s+(.+)/g;
  while ((match = unknownKeywordErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1435'
    });
  }

  // Pattern 18: Variable declaration name errors (TS1389)
  const variableDeclarationErrorRegex = /([^:]+):(\d+):(\d+)\s+-\s+error\s+TS1389:\s+(.+)/g;
  while ((match = variableDeclarationErrorRegex.exec(logText)) !== null) {
    addError({
      type: 'typescript',
      file: match[1].trim(),
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      message: match[4].trim(),
      code: 'TS1389'
    });
  }

  return errors;
}

// Run the test
testBuildFixWithRealProject().catch(console.error); 