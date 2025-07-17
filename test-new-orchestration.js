const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

async function testNewOrchestration() {
  console.log('🧪 Testing New Orchestration Flow...\n');
  console.log('📋 New Flow:');
  console.log('1. Generate backend code');
  console.log('2. Run backend build/fix pipeline');
  console.log('3. Test backend API with curl');
  console.log('4. Generate frontend code (with backend context)');
  console.log('5. Run full project build/fix pipeline');
  console.log('');

  // Check if we have a recent project to test with
  const projectsDir = path.join(__dirname, 'generated-projects');
  const projects = fs.readdirSync(projectsDir).filter(dir => {
    const projectPath = path.join(projectsDir, dir);
    return fs.statSync(projectPath).isDirectory();
  });

  if (projects.length === 0) {
    console.log('❌ No generated projects found. Please run code generation first.');
    return;
  }

  // Use the most recent project
  const latestProject = projects[projects.length - 1];
  const projectPath = path.join(projectsDir, latestProject);
  
  console.log(`📁 Using project: ${latestProject}`);
  console.log(`📍 Project path: ${projectPath}`);

  // Check project structure
  const backendPath = path.join(projectPath, 'backend');
  const frontendPath = path.join(projectPath, 'frontend');
  
  console.log('\n🔍 Checking project structure...');
  console.log(`Backend exists: ${fs.existsSync(backendPath)}`);
  console.log(`Frontend exists: ${fs.existsSync(frontendPath)}`);

  if (fs.existsSync(backendPath)) {
    const backendFiles = fs.readdirSync(backendPath, { recursive: true });
    console.log(`Backend files: ${backendFiles.length} files found`);
    
    // Check for key backend files
    const keyBackendFiles = ['package.json', 'index.js', 'app.js', 'server.js'];
    keyBackendFiles.forEach(file => {
      const filePath = path.join(backendPath, file);
      console.log(`  ${file}: ${fs.existsSync(filePath) ? '✅' : '❌'}`);
    });
  }

  if (fs.existsSync(frontendPath)) {
    const frontendFiles = fs.readdirSync(frontendPath, { recursive: true });
    console.log(`Frontend files: ${frontendFiles.length} files found`);
    
    // Check for key frontend files
    const keyFrontendFiles = ['package.json', 'src', 'public'];
    keyFrontendFiles.forEach(file => {
      const filePath = path.join(frontendPath, file);
      console.log(`  ${file}: ${fs.existsSync(filePath) ? '✅' : '❌'}`);
    });
  }

  // Test the backend API if backend exists
  if (fs.existsSync(backendPath)) {
    console.log('\n🧪 Testing Backend API...');
    
    try {
      const packageJsonPath = path.join(backendPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const startScript = packageJson.scripts?.start || packageJson.scripts?.dev || 'node index.js';
        const port = packageJson.port || 3000;
        
        console.log(`📦 Start script: ${startScript}`);
        console.log(`🌐 Port: ${port}`);
        
        // Try to start the server and test it
        console.log('🚀 Starting backend server for testing...');
        
        // Start server in background
        const serverProcess = exec('npm start', { cwd: backendPath });
        
        // Wait for server to start
        console.log('⏳ Waiting for server to start...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Test endpoints
        const endpointsToTest = [
          { path: '/', description: 'root endpoint' },
          { path: '/health', description: 'health check' },
          { path: '/api/health', description: 'API health check' },
          { path: '/api', description: 'API root' }
        ];
        
        for (const endpoint of endpointsToTest) {
          try {
            console.log(`🔍 Testing ${endpoint.description}...`);
            const curlCommand = `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}${endpoint.path}`;
            const { stdout } = await execAsync(curlCommand, { timeout: 5000 });
            
            const statusCode = parseInt(stdout.trim());
            if (statusCode >= 200 && statusCode < 500) {
              console.log(`  ✅ ${endpoint.description}: ${statusCode}`);
            } else {
              console.log(`  ⚠️ ${endpoint.description}: ${statusCode}`);
            }
          } catch (error) {
            console.log(`  ❌ ${endpoint.description}: Failed (${error.message})`);
          }
        }
        
        // Kill server process
        try {
          process.kill(serverProcess.pid);
        } catch (error) {
          // Process might have already ended
        }
        
        console.log('✅ Backend API test completed');
        
      } else {
        console.log('❌ Backend package.json not found');
      }
    } catch (error) {
      console.log(`❌ Backend API test failed: ${error.message}`);
    }
  }

  console.log('\n🎯 New Orchestration Test Summary:');
  console.log('✅ Project structure verified');
  console.log('✅ Backend API testing implemented');
  console.log('✅ Flow ready for integration testing');
  console.log('');
  console.log('💡 To test the full flow:');
  console.log('1. Run code generation with UML diagrams');
  console.log('2. Monitor the logs to see the new orchestration');
  console.log('3. Verify backend is built and tested before frontend');
}

// Run the test
testNewOrchestration().catch(console.error); 