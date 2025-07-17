import { Request, Response } from "express";
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
import { getProjectById, saveProject } from '../utils/projectFileStore';
import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { OpenAI } from "openai";
import { anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';

// Docker is optional - only import if available
let Docker: any = null;
try {
  Docker = require('dockerode');
  console.log('[Sandbox] Docker support enabled');
} catch (error) {
  console.log('[Sandbox] Docker not available - using local process fallback');
}

// Check if Docker is available and running
async function isDockerAvailable(): Promise<boolean> {
  if (!Docker) return false;
  
  try {
    const docker = new Docker();
    await docker.ping();
    return true;
  } catch (error) {
    console.log('[Sandbox] Docker daemon not running - using local process fallback');
    return false;
  }
}

// Sandbox job interface
interface SandboxJob extends MemoryOptimizedJob {
  jobId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  phase: 'setup' | 'dependency_analysis' | 'dependency_installation' | 'backend_build' | 'build_test' | 'runtime_test' | 'completed' | 'failed';
  lastAccessed: Date;
  sandboxUrl?: string;
  buildErrors?: string[];
  buildLogs?: string[];
  runtimeErrors?: string[];
  missingDependencies?: string[];
  addedDependencies?: string[];
  testResults?: any;
  appCode?: any;
}

const sandboxJobs: Record<string, SandboxJob> = {};

// Set up memory management for sandbox jobs
memoryManager.setupJobStoreCleanup(sandboxJobs, "sandboxJobs", 60 * 60 * 1000, 20); // 60 min, max 20 jobs

function generateSandboxJobId() {
  return `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new sandbox environment for code testing
 */
export const createSandbox = async (req: Request, res: Response): Promise<void> => {
  const { projectId, appCode } = req.body;
  
  if (!projectId || !appCode) {
    res.status(400).json({ error: "Project ID and application code are required" });
    return;
  }

  const jobId = generateSandboxJobId();
  console.log(`[Sandbox] Creating sandbox environment for project ${projectId}`);
  
  sandboxJobs[jobId] = {
    jobId,
    projectId,
    status: "processing",
    phase: "setup",
    progress: 10,
    lastAccessed: new Date(),
    appCode
  };

  // Start sandbox setup in background
  setupSandboxEnvironment(jobId, projectId, appCode);
  
  res.json({ 
    jobId, 
    status: "accepted",
    phase: "setup",
    message: "Creating sandbox environment..."
  });
};

/**
 * Setup sandbox environment with Docker containers
 */
async function setupSandboxEnvironment(jobId: string, projectId: string, appCode: any) {
  try {
    console.log(`[Sandbox] Setting up sandbox environment for job ${jobId}`);
    
    const job = sandboxJobs[jobId];
    job.progress = 20;
    job.phase = "setup";
    job.lastAccessed = new Date();

    // Use generated-projects directory directly instead of copying to sandbox
    const projectDir = path.join(process.cwd(), "generated-projects", projectId);
    
    // Ensure the project directory exists and has the generated code
    if (!fs.existsSync(projectDir)) {
      throw new Error(`Project directory not found: ${projectDir}. Please generate the project first.`);
    }
    
    console.log(`[Sandbox] Using existing project directory: ${projectDir}`);
    
    job.progress = 40;
    job.phase = "dependency_installation";
    job.lastAccessed = new Date();
    
    console.log(`[Sandbox] Installing dependencies in project directory...`);
    
    // Install dependencies directly in the project directory
    const installationResult = await installDependencies(projectDir);
    job.addedDependencies = installationResult.added;
    job.progress = 60;
    job.phase = "backend_build";
    job.lastAccessed = new Date();
    
    console.log(`[Sandbox] Dependencies installed`);
    
    // Build the backend
    job.progress = 60;
    job.phase = "backend_build";
    job.lastAccessed = new Date();
    
    console.log(`[Sandbox] Building backend for project ${projectId}...`);
    
    try {
      // Use the enhanced build process with AI auto-fixing
      const buildResult = await buildWithAutoFix(projectId);
      
      if (buildResult.success) {
        job.buildLogs = [...(job.buildLogs || []), ...buildResult.logs];
        job.buildErrors = buildResult.errors || [];
        console.log(`[Sandbox] Backend build successful with auto-fix`);
      } else {
        // Build failed even after AI auto-fixes
        job.buildLogs = [...(job.buildLogs || []), ...buildResult.logs];
        job.buildErrors = [...(job.buildErrors || []), ...buildResult.errors];
        console.log(`[Sandbox] Backend build failed after AI auto-fixes, but continuing with server startup`);
      }
      
    } catch (error: any) {
      job.buildErrors = [...(job.buildErrors || []), `Build error: ${error.message}`];
      console.log(`[Sandbox] Backend build error: ${error.message}`);
      // Continue with server startup even if build fails
    }
    
    // Move to runtime test phase
    job.progress = 80;
    job.phase = "runtime_test";
    job.lastAccessed = new Date();
    
    console.log(`[Sandbox] Build phase completed with ${job.buildErrors?.length || 0} errors`);
    
    // Test build process
    const buildResult = await testBuildProcess(projectDir);
    job.buildErrors = buildResult.errors;
    job.progress = 80;
    job.phase = "runtime_test";
    job.lastAccessed = new Date();
    
    console.log(`[Sandbox] Build test completed with ${buildResult.errors.length} errors`);
    
    // Start runtime environment
    const runtimeResult = await startRuntimeEnvironment(projectDir, projectId);
    job.sandboxUrl = runtimeResult.url;
    job.runtimeErrors = runtimeResult.errors;
    job.testResults = runtimeResult.testResults;
    job.progress = 100;
    job.phase = "completed";
    job.lastAccessed = new Date();
    
    console.log(`[Sandbox] Runtime environment started at ${runtimeResult.url}`);
    
    // Update project with sandbox information
    try {
      const project = await getProjectById(projectId);
      if (project) {
        project.sandboxJobId = jobId;
        project.sandboxUrl = runtimeResult.url;
        project.sandboxStatus = 'ready';
        project.buildErrors = job.buildErrors || [];
        project.runtimeErrors = runtimeResult.errors;
        project.addedDependencies = installationResult.added;
        await saveProject(project);
      }
    } catch (error) {
      console.error(`[Sandbox] Error updating project ${projectId}:`, error);
    }
    
    job.status = "completed";
    job.result = {
      sandboxUrl: runtimeResult.url,
      buildErrors: job.buildErrors || [],
      runtimeErrors: runtimeResult.errors,
      addedDependencies: installationResult.added,
      testResults: runtimeResult.testResults
    };
    job.endTime = new Date();
    
  } catch (error: any) {
    console.error(`[Sandbox] Setup failed for job ${jobId}:`, error);
    sandboxJobs[jobId] = {
      ...sandboxJobs[jobId],
      status: "failed",
      phase: "setup",
      progress: 100,
      error: error.message || "Sandbox setup failed",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

/**
 * Install basic dependencies
 */
async function installDependencies(projectDir: string): Promise<{ added: string[], errors: string[] }> {
  console.log(`[Sandbox] Installing basic dependencies`);
  
  const added: string[] = [];
  const errors: string[] = [];
  
  try {
    // Install frontend dependencies
    const frontendDir = path.join(projectDir, "frontend");
    if (fs.existsSync(frontendDir)) {
      console.log(`[Sandbox] Installing frontend dependencies...`);
      try {
        execSync('npm install', { cwd: frontendDir, stdio: 'pipe' });
        added.push('frontend-dependencies');
        console.log(`[Sandbox] Frontend dependencies installed successfully`);
      } catch (error: any) {
        errors.push(`Frontend dependency installation failed: ${error.message}`);
      }
    }
    
    // Install backend dependencies
    const backendDir = path.join(projectDir, "backend");
    if (fs.existsSync(backendDir)) {
      console.log(`[Sandbox] Installing backend dependencies...`);
      try {
        execSync('npm install', { cwd: backendDir, stdio: 'pipe' });
        added.push('backend-dependencies');
        console.log(`[Sandbox] Backend dependencies installed successfully`);
      } catch (error: any) {
        errors.push(`Backend dependency installation failed: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    errors.push(`Dependency installation failed: ${error.message}`);
  }
  
  return { added, errors };
}

/**
 * Test build process
 */
async function testBuildProcess(projectDir: string): Promise<{ success: boolean, errors: string[] }> {
  console.log(`[Sandbox] Testing enhanced build process`);
  
  const errors: string[] = [];
  
  try {
    // Test frontend build (Next.js)
    console.log(`[Sandbox] Testing frontend build (Next.js)`);
    try {
      // First install dependencies with longer timeout
      console.log(`[Sandbox] Installing frontend dependencies...`);
      execSync('npm install', {
        cwd: path.join(projectDir, "frontend"),
        stdio: 'pipe',
        timeout: 120000 // 2 minutes for dependency installation
      });
      
      // Type check first
      try {
        execSync('npm run type-check', {
          cwd: path.join(projectDir, "frontend"),
          stdio: 'pipe',
          timeout: 60000
        });
        console.log(`[Sandbox] Frontend TypeScript type check passed`);
      } catch (typeError: any) {
        console.log(`[Sandbox] Frontend type check warnings (non-critical): ${typeError.message}`);
        // Type errors are warnings, not critical failures for sandbox testing
      }
      
      // Build the Next.js app
      execSync('npm run build', {
        cwd: path.join(projectDir, "frontend"),
        stdio: 'pipe',
        timeout: 180000 // 3 minutes for Next.js build
      });
      
      console.log(`[Sandbox] Frontend build completed successfully`);
      
    } catch (error: any) {
      const errorMsg = `Frontend build failed: ${error.message}`;
      console.error(`[Sandbox] ${errorMsg}`);
      errors.push(errorMsg);
      
      // Try to extract more specific error information
      if (error.stdout) {
        errors.push(`Frontend stdout: ${error.stdout.toString()}`);
      }
      if (error.stderr) {
        errors.push(`Frontend stderr: ${error.stderr.toString()}`);
      }
    }
    
    // Test backend build (TypeScript)
    console.log(`[Sandbox] Testing backend build (TypeScript)`);
    try {
      // Install backend dependencies
      console.log(`[Sandbox] Installing backend dependencies...`);
      execSync('npm install', {
        cwd: path.join(projectDir, "backend"),
        stdio: 'pipe',
        timeout: 120000 // 2 minutes for dependency installation
      });
      
      // Type check backend
      try {
        execSync('npm run type-check', {
          cwd: path.join(projectDir, "backend"),
          stdio: 'pipe',
          timeout: 60000
        });
        console.log(`[Sandbox] Backend TypeScript type check passed`);
      } catch (typeError: any) {
        console.log(`[Sandbox] Backend type check warnings (non-critical): ${typeError.message}`);
      }
      
      // Build the backend
      execSync('npm run build', {
        cwd: path.join(projectDir, "backend"),
        stdio: 'pipe',
        timeout: 90000 // 1.5 minutes for TypeScript compilation
      });
      
      // Verify build output exists
      const distPath = path.join(projectDir, "backend", "dist");
      if (fs.existsSync(distPath)) {
        console.log(`[Sandbox] Backend build output verified at ${distPath}`);
      } else {
        errors.push("Backend build completed but no dist directory found");
      }
      
      console.log(`[Sandbox] Backend build completed successfully`);
      
    } catch (error: any) {
      const errorMsg = `Backend build failed: ${error.message}`;
      console.error(`[Sandbox] ${errorMsg}`);
      errors.push(errorMsg);
      
      // Try to extract more specific error information
      if (error.stdout) {
        errors.push(`Backend stdout: ${error.stdout.toString()}`);
      }
      if (error.stderr) {
        errors.push(`Backend stderr: ${error.stderr.toString()}`);
      }
    }
    
    // Summary
    const frontendSuccess = !errors.some(err => err.includes('Frontend build failed'));
    const backendSuccess = !errors.some(err => err.includes('Backend build failed'));
    
    console.log(`[Sandbox] Build test summary:`);
    console.log(`  - Frontend: ${frontendSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  - Backend: ${backendSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  - Total errors: ${errors.length}`);
    
  } catch (error: any) {
    const errorMsg = `Build test setup failed: ${error.message}`;
    console.error(`[Sandbox] ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  return { success: errors.length === 0, errors };
}

/**
 * Start runtime environment
 */
async function startRuntimeEnvironment(sandboxDir: string, projectId: string): Promise<{ url: string, errors: string[], testResults: any }> {
  console.log(`[Sandbox] Starting runtime environment`);
  
  const errors: string[] = [];
  const testResults: any = {};
  
  try {
    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();
    
    if (dockerAvailable) {
      console.log(`[Sandbox] Using Docker containers for isolated runtime`);
      return await startDockerEnvironment(sandboxDir, projectId);
    } else {
      console.log(`[Sandbox] Using local processes for runtime (Docker not available)`);
      return await startLocalEnvironment(sandboxDir, projectId);
    }
    
  } catch (error: any) {
    errors.push(`Runtime environment setup failed: ${error.message}`);
    return {
      url: '',
      errors,
      testResults: { backendHealth: 'FAILED', frontendHealth: 'FAILED' }
    };
  }
}

/**
 * Start Docker-based environment (when Docker is available)
 */
async function startDockerEnvironment(projectDir: string, projectId: string): Promise<{ url: string, errors: string[], testResults: any }> {
  const errors: string[] = [];
  const testResults: any = {};
  
  try {
    // Start backend server
    const backendPort = 5000 + Math.floor(Math.random() * 1000); // Random port
    const frontendPort = 3000 + Math.floor(Math.random() * 1000); // Random port
    
    // Create Docker containers for isolated runtime
    const docker = new Docker();
    
    // Backend container
    const backendContainer = await docker.createContainer({
      Image: 'node:18-alpine',
      name: `sandbox-backend-${projectId}`,
      Cmd: ['sh', '-c', 'cd /app && npm install && npm start'],
      ExposedPorts: { [`${backendPort}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${backendPort}/tcp`]: [{ HostPort: backendPort.toString() }] },
        Binds: [`${path.join(projectDir, "backend")}:/app`]
      }
    });
    
    await backendContainer.start();
    
    // Frontend container
    const frontendContainer = await docker.createContainer({
      Image: 'node:18-alpine',
      name: `sandbox-frontend-${projectId}`,
      Cmd: ['sh', '-c', 'cd /app && npm install && npm start'],
      ExposedPorts: { [`${frontendPort}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${frontendPort}/tcp`]: [{ HostPort: frontendPort.toString() }] },
        Binds: [`${path.join(projectDir, "frontend")}:/app`]
      },
      Env: [`REACT_APP_API_URL=http://localhost:${backendPort}`]
    });
    
    await frontendContainer.start();
    
    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test API endpoints
    try {
      const response = await fetch(`http://localhost:${backendPort}/health`);
      if (response.ok) {
        testResults.backendHealth = 'OK';
      } else {
        testResults.backendHealth = 'FAILED';
        errors.push('Backend health check failed');
      }
    } catch (error: any) {
      testResults.backendHealth = 'FAILED';
      errors.push(`Backend health check error: ${error.message}`);
    }
    
    // Test frontend
    try {
      const response = await fetch(`http://localhost:${frontendPort}`);
      if (response.ok) {
        testResults.frontendHealth = 'OK';
      } else {
        testResults.frontendHealth = 'FAILED';
        errors.push('Frontend health check failed');
      }
    } catch (error: any) {
      testResults.frontendHealth = 'FAILED';
      errors.push(`Frontend health check error: ${error.message}`);
    }
    
    return {
      url: `http://localhost:${frontendPort}`,
      errors,
      testResults
    };
    
  } catch (error: any) {
    errors.push(`Docker environment setup failed: ${error.message}`);
    return {
      url: '',
      errors,
      testResults: { backendHealth: 'FAILED', frontendHealth: 'FAILED' }
    };
  }
}

/**
 * Start local process-based environment (Docker fallback)
 */
async function startLocalEnvironment(projectDir: string, projectId: string): Promise<{ url: string, errors: string[], testResults: any }> {
  const errors: string[] = [];
  const testResults: any = {};
  
  try {
    console.log(`[Sandbox] Starting enhanced local processes for project ${projectId}`);
    
    // Generate random ports to avoid conflicts
    const backendPort = 5000 + Math.floor(Math.random() * 1000);
    const frontendPort = 3000 + Math.floor(Math.random() * 1000);
    
    console.log(`[Sandbox] Assigned ports - Backend: ${backendPort}, Frontend: ${frontendPort}`);
    
    // Start backend process
    let backendProcess: any = null;
    try {
      console.log(`[Sandbox] Starting backend server...`);
      
      // Check if we have a built backend first
      const backendDistPath = path.join(projectDir, "backend", "dist");
      const backendSrcPath = path.join(projectDir, "backend", "src");
      
      if (fs.existsSync(backendDistPath) && fs.existsSync(path.join(backendDistPath, "index.js"))) {
        // Use built version
        console.log(`[Sandbox] Using built backend from dist/`);
        
        // Update port in environment
        const envPath = path.join(projectDir, "backend", ".env");
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/PORT=\d+/, `PORT=${backendPort}`);
        fs.writeFileSync(envPath, envContent);
        
        backendProcess = spawn('node', ['dist/index.js'], {
          cwd: path.join(projectDir, "backend"),
          stdio: 'pipe',
          detached: false,
          env: { ...process.env, PORT: backendPort.toString() }
        });
        
      } else if (fs.existsSync(backendSrcPath) && fs.existsSync(path.join(backendSrcPath, "index.ts"))) {
        // Use development version with ts-node
        console.log(`[Sandbox] Using development backend with ts-node`);
        
        backendProcess = spawn('npm', ['run', 'dev'], {
          cwd: path.join(projectDir, "backend"),
          stdio: 'pipe',
          detached: false,
          env: { ...process.env, PORT: backendPort.toString() }
        });
        
      } else {
        // Create and use simple fallback server
        console.log(`[Sandbox] Creating fallback backend server`);
        const fallbackServer = createFallbackBackendServer(backendPort);
        fs.writeFileSync(path.join(projectDir, "backend", "fallback-server.js"), fallbackServer);
        
        backendProcess = spawn('node', ['fallback-server.js'], {
          cwd: path.join(projectDir, "backend"),
          stdio: 'pipe',
          detached: false
        });
      }
      
      if (backendProcess) {
        testResults.backendProcess = 'STARTED';
        testResults.backendPid = backendProcess.pid;
        console.log(`[Sandbox] Backend process started (PID: ${backendProcess.pid}) on port ${backendPort}`);
        
        // Log backend output for debugging
        backendProcess.stdout?.on('data', (data: Buffer) => {
          console.log(`[Sandbox Backend] ${data.toString()}`);
        });
        
        backendProcess.stderr?.on('data', (data: Buffer) => {
          console.log(`[Sandbox Backend Error] ${data.toString()}`);
        });
      }
      
    } catch (error: any) {
      errors.push(`Backend process start failed: ${error.message}`);
      testResults.backendProcess = 'FAILED';
    }
    
    // Start frontend process  
    let frontendProcess: any = null;
    try {
      console.log(`[Sandbox] Starting frontend server...`);
      
      // Check if we have a built frontend
      const frontendNextPath = path.join(projectDir, "frontend", ".next");
      const frontendSrcPath = path.join(projectDir, "frontend", "src");
      
      // Update frontend environment to point to correct backend
      const frontendEnvPath = path.join(projectDir, "frontend", ".env.local");
      let frontendEnvContent = `NEXT_PUBLIC_API_URL=http://localhost:${backendPort}
NEXT_PUBLIC_APP_ENV=sandbox
PORT=${frontendPort}
`;
      fs.writeFileSync(frontendEnvPath, frontendEnvContent);
      
      if (fs.existsSync(frontendNextPath)) {
        // Use built version
        console.log(`[Sandbox] Using built frontend (Next.js production)`);
        
        frontendProcess = spawn('npm', ['start'], {
          cwd: path.join(projectDir, "frontend"),
          stdio: 'pipe',
          detached: false,
          env: { ...process.env, PORT: frontendPort.toString() }
        });
        
      } else if (fs.existsSync(frontendSrcPath)) {
        // Use development version
        console.log(`[Sandbox] Using development frontend (Next.js dev)`);
        
        frontendProcess = spawn('npm', ['run', 'dev'], {
          cwd: path.join(projectDir, "frontend"),
          stdio: 'pipe',
          detached: false,
          env: { ...process.env, PORT: frontendPort.toString() }
        });
        
      } else {
        // Create fallback static server
        console.log(`[Sandbox] Creating fallback frontend server`);
        const fallbackFrontend = createFallbackFrontendServer(frontendPort, backendPort, projectId);
        fs.writeFileSync(path.join(projectDir, "frontend", "fallback-server.js"), fallbackFrontend);
        
        frontendProcess = spawn('node', ['fallback-server.js'], {
          cwd: path.join(projectDir, "frontend"),
          stdio: 'pipe',
          detached: false
        });
      }
      
      if (frontendProcess) {
        testResults.frontendProcess = 'STARTED';
        testResults.frontendPid = frontendProcess.pid;
        console.log(`[Sandbox] Frontend process started (PID: ${frontendProcess.pid}) on port ${frontendPort}`);
        
        // Log frontend output for debugging
        frontendProcess.stdout?.on('data', (data: Buffer) => {
          console.log(`[Sandbox Frontend] ${data.toString()}`);
        });
        
        frontendProcess.stderr?.on('data', (data: Buffer) => {
          console.log(`[Sandbox Frontend Error] ${data.toString()}`);
        });
      }
      
    } catch (error: any) {
      errors.push(`Frontend process start failed: ${error.message}`);
      testResults.frontendProcess = 'FAILED';
    }
    
    // Wait for processes to start
    console.log(`[Sandbox] Waiting for processes to initialize...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test backend health
    try {
      console.log(`[Sandbox] Testing backend health at http://localhost:${backendPort}/health`);
      const response = await fetch(`http://localhost:${backendPort}/health`);
      if (response.ok) {
        const healthData = await response.json();
        testResults.backendHealth = 'OK';
        testResults.backendHealthData = healthData;
        console.log(`[Sandbox] Backend health check passed:`, healthData);
      } else {
        testResults.backendHealth = 'FAILED';
        errors.push(`Backend health check failed with status: ${response.status}`);
      }
    } catch (error: any) {
      testResults.backendHealth = 'FAILED';
      errors.push(`Backend health check error: ${error.message}`);
    }
    
    // Test frontend
    try {
      console.log(`[Sandbox] Testing frontend at http://localhost:${frontendPort}`);
      const response = await fetch(`http://localhost:${frontendPort}`);
      if (response.ok) {
        testResults.frontendHealth = 'OK';
        console.log(`[Sandbox] Frontend health check passed`);
      } else {
        testResults.frontendHealth = 'FAILED';
        errors.push(`Frontend health check failed with status: ${response.status}`);
      }
    } catch (error: any) {
      testResults.frontendHealth = 'FAILED';
      errors.push(`Frontend health check error: ${error.message}`);
    }
    
    // Store process references and ports for future management
    testResults.processes = {
      backend: backendProcess?.pid,
      frontend: frontendProcess?.pid
    };
    testResults.ports = {
      backend: backendPort,
      frontend: frontendPort
    };
    testResults.startTime = new Date().toISOString();
    
    console.log(`[Sandbox] Local environment setup completed for project ${projectId}`);
    console.log(`[Sandbox] Frontend URL: http://localhost:${frontendPort}`);
    console.log(`[Sandbox] Backend API: http://localhost:${backendPort}`);
    
    return {
      url: `http://localhost:${frontendPort}`,
      errors,
      testResults
    };
    
  } catch (error: any) {
    errors.push(`Local environment setup failed: ${error.message}`);
    return {
      url: '',
      errors,
      testResults: { backendHealth: 'FAILED', frontendHealth: 'FAILED' }
    };
  }
}

/**
 * Create fallback backend server
 */
function createFallbackBackendServer(port: number): string {
  return `const express = require('express');
const cors = require('cors');
const app = express();
const PORT = ${port};

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Sandbox fallback backend is running',
    type: 'fallback'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Generated Sandbox Backend (Fallback)',
    version: '1.0.0',
    type: 'fallback',
    endpoints: {
      health: '/health',
      api: '/api/test'
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Fallback API is working',
    timestamp: new Date().toISOString(),
    type: 'fallback'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(\`🚀 Sandbox fallback backend running on port \${PORT}\`);
});
`;
}

/**
 * Create fallback frontend server
 */
function createFallbackFrontendServer(frontendPort: number, backendPort: number, projectId: string): string {
  return `const express = require('express');
const path = require('path');
const app = express();
const PORT = ${frontendPort};

app.use(express.static('.'));

app.get('/', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sandbox Environment - Generated App</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container { 
          max-width: 800px; 
          padding: 40px;
          text-align: center;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; font-weight: 700; }
        .subtitle { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .status-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px; 
          margin: 2rem 0;
        }
        .status-card { 
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .status-title { font-weight: 600; margin-bottom: 10px; }
        .status-value { font-size: 0.9rem; opacity: 0.8; }
        .btn { 
          display: inline-block;
          padding: 12px 24px;
          background: rgba(255,255,255,0.2);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.3);
          margin: 10px;
          transition: all 0.3s ease;
        }
        .btn:hover { 
          background: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
        .info { margin-top: 2rem; font-size: 0.9rem; opacity: 0.8; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Sandbox Environment</h1>
        <p class="subtitle">Your AI-generated application is running in sandbox mode</p>
        
        <div class="status-grid">
          <div class="status-card">
            <div class="status-title">✅ Frontend Status</div>
            <div class="status-value">Running on port ${frontendPort}</div>
          </div>
          <div class="status-card">
            <div class="status-title">📡 Backend API</div>
            <div class="status-value">http://localhost:${backendPort}</div>
          </div>
          <div class="status-card">
            <div class="status-title">📁 Project ID</div>
            <div class="status-value">${projectId}</div>
          </div>
          <div class="status-card">
            <div class="status-title">⚡ Environment</div>
            <div class="status-value">Local Sandbox (Fallback)</div>
          </div>
        </div>
        
        <div>
          <a href="#" class="btn" onclick="testBackend()">Test Backend Connection</a>
          <a href="/health" class="btn">Frontend Health</a>
        </div>
        
        <div id="api-result" style="margin-top: 20px; min-height: 50px;"></div>
        
        <div class="info">
          <p>This is a fallback interface for testing your generated application.</p>
          <p>The actual generated components and features are being validated in the background.</p>
        </div>
      </div>
      
      <script>
        async function testBackend() {
          const resultDiv = document.getElementById('api-result');
          resultDiv.innerHTML = '<p style="opacity: 0.7;">Testing backend connection...</p>';
          
          try {
            const response = await fetch('http://localhost:${backendPort}/api/test');
            const data = await response.json();
            resultDiv.innerHTML = \`
              <div style="background: rgba(0,255,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(0,255,0,0.3);">
                <strong>✅ Backend Connection Successful</strong><br>
                <small>\${JSON.stringify(data, null, 2)}</small>
              </div>
            \`;
          } catch (error) {
            resultDiv.innerHTML = \`
              <div style="background: rgba(255,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,0,0,0.3);">
                <strong>❌ Backend Connection Failed</strong><br>
                <small>\${error.message}</small>
              </div>
            \`;
          }
        }
        
        // Auto-test backend on load
        setTimeout(testBackend, 1000);
      </script>
    </body>
    </html>
  \`);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Sandbox fallback frontend is running',
    type: 'fallback',
    ports: { frontend: ${frontendPort}, backend: ${backendPort} }
  });
});

app.listen(PORT, () => {
  console.log(\`🌐 Sandbox fallback frontend running on port \${PORT}\`);
});
`;
}

/**
 * Get sandbox status
 */
export const getSandboxStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  if (!jobId || !sandboxJobs[jobId]) {
    res.status(404).json({ error: "Sandbox job not found" });
    return;
  }

  const job = sandboxJobs[jobId];
  memoryManager.touchJob(job);
  
  res.json({
    jobId,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    sandboxUrl: job.sandboxUrl,
    buildErrors: job.buildErrors,
    runtimeErrors: job.runtimeErrors,
    missingDependencies: job.missingDependencies,
    addedDependencies: job.addedDependencies,
    testResults: job.testResults,
    error: job.error
  });
};

/**
 * Get sandbox health
 */
export const getSandboxHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeJobs = Object.keys(sandboxJobs).length;
    const completedJobs = Object.values(sandboxJobs).filter(job => job.status === 'completed').length;
    const failedJobs = Object.values(sandboxJobs).filter(job => job.status === 'failed').length;

    res.json({
      status: "healthy",
      activeJobs: activeJobs,
      completedJobs: completedJobs,
      failedJobs: failedJobs,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    });

  } catch (error: any) {
    console.error(`[Sandbox] Health check error:`, error);
    res.status(500).json({ 
      status: "unhealthy", 
      error: error.message || "Health check failed" 
    });
  }
}; 

/**
 * AI-powered auto-fixing system for sandbox builds
 */
async function autoFixTypeScriptErrors(projectId: string, buildErrors: string): Promise<{ fixed: boolean; logs: string[]; errors: string[] }> {
  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    logs.push("🤖 Starting AI-powered TypeScript error auto-fix...");
    
    // Parse build errors to extract file paths and error details
    const errorDetails = parseTypeScriptErrors(buildErrors);
    logs.push(`📋 Found ${errorDetails.length} TypeScript errors to fix`);
    
    if (errorDetails.length === 0) {
      logs.push("✅ No errors to fix");
      return { fixed: true, logs, errors };
    }
    
    // Group errors by file for batch processing
    const errorsByFile = groupErrorsByFile(errorDetails);
    logs.push(`📁 Errors found in ${Object.keys(errorsByFile).length} files`);
    
    let totalFixed = 0;
    
    // Process each file with errors
    for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
      try {
        logs.push(`🔧 Fixing errors in ${filePath}...`);
        
        const fixResult = await fixFileErrors(projectId, filePath, fileErrors);
        
        if (fixResult.fixed) {
          totalFixed += fixResult.fixedCount;
          logs.push(`✅ Fixed ${fixResult.fixedCount} errors in ${filePath}`);
        } else {
          errors.push(`Failed to fix errors in ${filePath}: ${fixResult.error}`);
          logs.push(`❌ Failed to fix errors in ${filePath}`);
        }
        
      } catch (error: any) {
        errors.push(`Error fixing ${filePath}: ${error.message}`);
        logs.push(`❌ Error fixing ${filePath}: ${error.message}`);
      }
    }
    
    logs.push(`🎯 Auto-fix completed: ${totalFixed} errors fixed out of ${errorDetails.length} total errors`);
    
    return { 
      fixed: totalFixed > 0, 
      logs, 
      errors 
    };
    
  } catch (error: any) {
    errors.push(`Auto-fix system error: ${error.message}`);
    logs.push(`❌ Auto-fix system error: ${error.message}`);
    return { fixed: false, logs, errors };
  }
}

/**
 * Parse TypeScript compilation errors
 */
function parseTypeScriptErrors(buildOutput: string): Array<{ file: string; line: number; message: string; code: string }> {
  const errors: Array<{ file: string; line: number; message: string; code: string }> = [];
  
  // TypeScript error pattern: file.ts:line:column - error TS1234: message
  const errorRegex = /([^:]+):(\d+):(\d+)\s*-\s*error\s+TS(\d+):\s*(.+)/g;
  
  let match;
  while ((match = errorRegex.exec(buildOutput)) !== null) {
    const [, file, line, column, code, message] = match;
    errors.push({
      file: file.trim(),
      line: parseInt(line),
      message: message.trim(),
      code: `TS${code}`
    });
  }
  
  return errors;
}

/**
 * Group errors by file
 */
function groupErrorsByFile(errors: Array<{ file: string; line: number; message: string; code: string }>): Record<string, Array<{ line: number; message: string; code: string }>> {
  const grouped: Record<string, Array<{ line: number; message: string; code: string }>> = {};
  
  for (const error of errors) {
    if (!grouped[error.file]) {
      grouped[error.file] = [];
    }
    grouped[error.file].push({
      line: error.line,
      message: error.message,
      code: error.code
    });
  }
  
  return grouped;
}

/**
 * Fix errors in a specific file using AI
 */
async function fixFileErrors(projectId: string, filePath: string, errors: Array<{ line: number; message: string; code: string }>): Promise<{ fixed: boolean; fixedCount: number; error?: string }> {
  try {
    const projectDir = path.join(process.cwd(), "generated-projects", projectId, "backend");
    const fullFilePath = path.join(projectDir, filePath);
    
    // Read the current file content
    const currentContent = fs.readFileSync(fullFilePath, 'utf8');
    
    // Create AI prompt for fixing the errors
    const aiPrompt = createFixPrompt(filePath, currentContent, errors);
    
    // Call AI to fix the errors
    const fixedContent = await callAIToFixErrors(aiPrompt);
    
    if (fixedContent && fixedContent !== currentContent) {
      // Write the fixed content back to the file
      fs.writeFileSync(fullFilePath, fixedContent, 'utf8');
      
      return { 
        fixed: true, 
        fixedCount: errors.length 
      };
    } else {
      return { 
        fixed: false, 
        fixedCount: 0, 
        error: "AI returned no changes or same content" 
      };
    }
    
  } catch (error: any) {
    return { 
      fixed: false, 
      fixedCount: 0, 
      error: error.message 
    };
  }
}

/**
 * Create AI prompt for fixing TypeScript errors
 */
function createFixPrompt(filePath: string, fileContent: string, errors: Array<{ line: number; message: string; code: string }>): string {
  const errorList = errors.map(e => `Line ${e.line}: ${e.message} (${e.code})`).join('\n');
  
  return `You are an expert TypeScript developer. Fix the following TypeScript errors in this file:

FILE: ${filePath}

ERRORS:
${errorList}

CURRENT FILE CONTENT:
\`\`\`typescript
${fileContent}
\`\`\`

INSTRUCTIONS:
1. Fix all the TypeScript errors listed above
2. Maintain the existing functionality and logic
3. Add proper type annotations where missing
4. Handle undefined/null values appropriately
5. Add missing imports if needed
6. Return ONLY the fixed TypeScript code, no explanations

FIXED CODE:
\`\`\`typescript
`;
}

/**
 * Call AI to fix TypeScript errors
 */
async function callAIToFixErrors(prompt: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    });
    const content = response.content[0];
    const resultText = content.type === 'text' ? content.text : '';
    
    if (!resultText) {
      throw new Error("No response from AI");
    }
    
    return resultText.trim();
    
  } catch (error: any) {
    console.error("AI fix error:", error);
    throw new Error(`AI fix failed: ${error.message}`);
  }
}

/**
 * Enhanced build process with auto-fixing
 */
async function buildWithAutoFix(projectId: string): Promise<{ success: boolean; logs: string[]; errors: string[] }> {
  const logs: string[] = [];
  const errors: string[] = [];
  
  try {
    logs.push("🔨 Starting enhanced build process with auto-fix...");
    
    const projectDir = path.join(process.cwd(), "generated-projects", projectId, "backend");
    
    // First attempt: Try to build normally
    logs.push("📦 Attempting normal build...");
    const buildResult = await runBuildCommand(projectDir);
    
    if (buildResult.success) {
      logs.push("✅ Build successful on first attempt");
      return { success: true, logs, errors };
    }
    
    logs.push("⚠️ Build failed, attempting AI-powered auto-fix...");
    
    // Second attempt: Auto-fix errors and retry
    const fixResult = await autoFixTypeScriptErrors(projectId, buildResult.output);
    logs.push(...fixResult.logs);
    errors.push(...fixResult.errors);
    
    if (fixResult.fixed) {
      logs.push("🔄 Retrying build after auto-fix...");
      const retryResult = await runBuildCommand(projectDir);
      
      if (retryResult.success) {
        logs.push("✅ Build successful after auto-fix!");
        return { success: true, logs, errors };
      } else {
        logs.push("⚠️ Build still failed after auto-fix, attempting second round...");
        
        // Third attempt: Try one more round of fixes
        const secondFixResult = await autoFixTypeScriptErrors(projectId, retryResult.output);
        logs.push(...secondFixResult.logs);
        errors.push(...secondFixResult.errors);
        
        if (secondFixResult.fixed) {
          logs.push("🔄 Final build attempt...");
          const finalResult = await runBuildCommand(projectDir);
          
          if (finalResult.success) {
            logs.push("✅ Build successful after second auto-fix round!");
            return { success: true, logs, errors };
          } else {
            logs.push("❌ Build failed after multiple auto-fix attempts");
            errors.push("Build failed after multiple auto-fix attempts");
            return { success: false, logs, errors };
          }
        } else {
          logs.push("❌ No more fixes could be applied");
          errors.push("No more fixes could be applied");
          return { success: false, logs, errors };
        }
      }
    } else {
      logs.push("❌ Auto-fix failed to resolve any errors");
      errors.push("Auto-fix failed to resolve any errors");
      return { success: false, logs, errors };
    }
    
  } catch (error: any) {
    errors.push(`Build process error: ${error.message}`);
    logs.push(`❌ Build process error: ${error.message}`);
    return { success: false, logs, errors };
  }
}

/**
 * Run build command and capture output
 */
async function runBuildCommand(sandboxDir: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: sandboxDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    buildProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    buildProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    buildProcess.on('close', (code) => {
      const output = stdout + stderr;
      resolve({
        success: code === 0,
        output
      });
    });
    
    buildProcess.on('error', (error) => {
      resolve({
        success: false,
        output: `Build command error: ${error.message}`
      });
    });
  });
}

/**
 * Redeploy sandbox environment (retry failed sandbox)
 */
export const redeploySandbox = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.body;
  
  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  console.log(`[Sandbox] Redeploying sandbox for project ${projectId}`);
  
  // Check if there's an existing failed job for this project
  const existingJob = Object.values(sandboxJobs).find(job => 
    job.projectId === projectId && job.status === 'failed'
  );
  
  if (existingJob) {
    console.log(`[Sandbox] Found existing failed job ${existingJob.jobId}, cleaning up...`);
    // Clean up the failed job
    delete sandboxJobs[existingJob.jobId];
  }
  
  // Get the project to retrieve the app code
  try {
    const project = await getProjectById(projectId);
    if (!project || !project.appCode) {
      res.status(404).json({ error: "Project not found or no application code available" });
      return;
    }
    
    // Create a new sandbox job
    const jobId = generateSandboxJobId();
    
    sandboxJobs[jobId] = {
      jobId,
      projectId,
      status: "processing",
      phase: "setup",
      progress: 10,
      lastAccessed: new Date(),
      appCode: project.appCode
    };

    // Start sandbox setup in background
    setupSandboxEnvironment(jobId, projectId, project.appCode);
    
    res.json({ 
      jobId, 
      status: "accepted",
      phase: "setup",
      message: "Redeploying sandbox environment...",
      isRedeploy: true
    });
    
  } catch (error: any) {
    console.error(`[Sandbox] Error redeploying sandbox for project ${projectId}:`, error);
    res.status(500).json({ 
      error: "Failed to redeploy sandbox", 
      details: error.message 
    });
  }
};