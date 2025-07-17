// Try to import from different possible locations
let buildFixService;
try {
  // First try the compiled version
  const { buildFixService: compiledService } = require('./dist/services/buildFixService');
  buildFixService = compiledService;
} catch (error) {
  try {
    // Try the source TypeScript version
    const { buildFixService: sourceService } = require('./src/services/buildFixService');
    buildFixService = sourceService;
  } catch (sourceError) {
    console.error('❌ Could not import buildFixService. Please ensure:');
    console.error('   1. TypeScript is compiled: npm run build');
    console.error('   2. Or run with ts-node: npx ts-node test-build-fix.js');
    console.error('   3. Or use the source files directly');
    process.exit(1);
  }
}

const path = require('path');
const fs = require('fs');

async function testBuildFixService() {
  console.log('🧪 Testing Build Fix Service...');
  
  // Create a test project with intentional errors
  const testProjectPath = path.join(__dirname, 'test-project');
  
  try {
    // Clean up any existing test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
    
    // Create test project structure
    fs.mkdirSync(testProjectPath, { recursive: true });
    fs.mkdirSync(path.join(testProjectPath, 'src'), { recursive: true });
    
    // Create package.json
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      scripts: {
        build: "tsc",
        test: "echo 'No tests specified'"
      },
      devDependencies: {
        typescript: "^5.0.0",
        eslint: "^8.0.0"
      }
    };
    fs.writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      },
      include: ["src/**/*"]
    };
    fs.writeFileSync(path.join(testProjectPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    
    // Create a TypeScript file with intentional errors
    const problematicCode = `
import React from 'react';

interface User {
  name: string;
  email: string;
}

const UserComponent: React.FC<User> = ({ name, email }) => {
  // Missing import for useState
  const [count, setCount] = useState(0);
  
  // Undefined variable
  console.log(undefinedVariable);
  
  // Type error
  const user: User = {
    name: "John",
    email: "john@example.com",
    age: 30 // This property doesn't exist in User interface
  };
  
  return (
    <div>
      <h1>{name}</h1>
      <p>{email}</p>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
};

export default UserComponent;
`;
    fs.writeFileSync(path.join(testProjectPath, 'src/UserComponent.tsx'), problematicCode);
    
    console.log('📁 Test project created with intentional errors');
    console.log('🔧 Running build fix pipeline...');
    
    // Run the build fix pipeline
    const result = await buildFixService.runBuildAndFixPipeline(testProjectPath, 'test-job-123');
    
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
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning.type}: ${warning.message}`);
      });
    }
    
    console.log('\n📋 Build Logs (last 10 lines):');
    const lastLogs = result.logs.slice(-10);
    lastLogs.forEach(log => console.log(`  ${log}`));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test project
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
      console.log('\n🧹 Test project cleaned up');
    }
  }
}

// Run the test
testBuildFixService().catch(console.error); 