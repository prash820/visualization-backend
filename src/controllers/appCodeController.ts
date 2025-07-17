// src/controllers/appCodeController.ts
import express from "express";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
import { getProjectById, saveProject } from '../utils/projectFileStore';
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import fs from 'fs/promises';
import path from 'path';
import { umlToBackendCodePlan, umlToFrontendCodePlan } from '../utils/umlToCodePlan';
import { generateFrontendComponents } from '../agents/frontendComponentAgent';
import { generateBackendComponents } from '../agents/backendComponentAgent';
import { generateBackendModelFiles } from '../agents/backendModelAgent';
import { generateStateLogicFiles } from '../agents/stateLogicAgent';
import { generateApiFlowFiles } from '../agents/apiFlowAgent';
import { generateActivityFiles } from '../agents/activityAgent';
import { generateBackendBuildFilesWithAI } from '../agents/backendBuildAgent';
import { buildFixService } from '../services/buildFixService';
import { buildFileGenerator } from '../services/buildFileGenerator';
import { exec } from 'child_process';
import { promisify } from 'util';
dotenv.config();

const execAsync = promisify(exec);

// Add this interface for code generation jobs
interface CodeGenerationJob {
  id: string;
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
  logs: string[];
  currentStep: string;
}

const codeGenerationJobs: { [jobId: string]: CodeGenerationJob } = {};

// Add this function to generate job IDs
function generateCodeGenerationJobId(): string {
  return `code-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add this function to add logs to a job
function addCodeGenerationLog(jobId: string, log: string) {
  const timestampedLog = `[${new Date().toISOString()}] ${log}`;
  console.log(`[AppCode] Job ${jobId}: ${log}`);
  if (codeGenerationJobs[jobId]) {
    codeGenerationJobs[jobId].logs.push(timestampedLog);
    codeGenerationJobs[jobId].lastAccessed = new Date();
  }
}


// Add this function to clean up existing project folders
async function cleanupProjectFolder(projectId: string, jobId: string): Promise<void> {
  try {
    const projectPath = path.join(process.cwd(), 'generated-projects', projectId);
    
    // Check if the project folder exists
    try {
      await fs.access(projectPath);
      console.log(`[AppCode] Job ${jobId}: Found existing project folder, cleaning up...`);
      addCodeGenerationLog(jobId, "Cleaning up existing project folder...");
      
      // Delete the entire project folder recursively
      await fs.rm(projectPath, { recursive: true, force: true });
      console.log(`[AppCode] Job ${jobId}: Successfully deleted existing project folder`);
      addCodeGenerationLog(jobId, "Successfully cleaned up existing project folder");
    } catch (error) {
      // Folder doesn't exist, which is fine
      console.log(`[AppCode] Job ${jobId}: No existing project folder found, proceeding with fresh generation`);
      addCodeGenerationLog(jobId, "No existing project folder found, proceeding with fresh generation");
    }
  } catch (error: any) {
    console.error(`[AppCode] Job ${jobId}: Error during cleanup: ${error.message}`);
    addCodeGenerationLog(jobId, `Warning: Cleanup failed: ${error.message}`);
    // Don't fail the job if cleanup fails, just log the warning
  }
}

export const generateApplicationCode = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId, umlDiagrams } = req.body;

  if (!prompt || !projectId) {
    res.status(400).json({ error: "Prompt and project ID are required" });
    return;
  }

  // Create a job for this code generation
  const jobId = generateCodeGenerationJobId();
  console.log(`[AppCode] Starting code generation job ${jobId} for project ${projectId}`);
  console.log(`[AppCode] Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  
  codeGenerationJobs[jobId] = {
    id: jobId,
    status: 'processing',
    progress: 0,
    currentStep: 'Initializing code generation...',
    logs: [],
    startTime: new Date(),
    lastAccessed: new Date()
  };

  // Return the job ID immediately for streaming
  res.json({ 
    success: true, 
    jobId,
    message: "Code generation started. Use the job ID to stream logs."
  });

  // Start the background processing
  processCodeGenerationJob(jobId, prompt, projectId, umlDiagrams);
};

export const generateAppCodeForProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }
  const project = await getProjectById(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!project.prompt) {
    res.status(400).json({ error: "Project prompt is required" });
    return;
  }
  
  
  // Use empty object if no diagrams
  const umlDiagrams = project.umlDiagrams || {};
  
  // Create a job for this code generation
  const jobId = generateCodeGenerationJobId();
  console.log(`[AppCode] Starting code generation job ${jobId} for existing project ${projectId}`);
  console.log(`[AppCode] Project prompt: ${project.prompt.substring(0, 100)}${project.prompt.length > 100 ? '...' : ''}`);
  
  codeGenerationJobs[jobId] = {
    id: jobId,
    status: 'processing',
    progress: 0,
    currentStep: 'Initializing code generation...',
    logs: [],
    startTime: new Date(),
    lastAccessed: new Date()
  };
  res.json({ success: true, jobId, message: "Code generation started for project." });
  processCodeGenerationJob(jobId, project.prompt, projectId, umlDiagrams);
};

async function processCodeGenerationJob(jobId: string, prompt: string, projectId: string, umlDiagrams: any) {
  try {
    console.log(`[AppCode] Background processing started for job ${jobId}`);
    addCodeGenerationLog(jobId, "Starting code generation process...");
    
    // Clean up existing project folder before starting
    await cleanupProjectFolder(projectId, jobId);

    // Ensure project directory exists before writing any files
    const projectPath = path.join(process.cwd(), 'generated-projects', projectId);
    await fs.mkdir(projectPath, { recursive: true });

    
    // === Build the Backend CodePlan and save ===
    addCodeGenerationLog(jobId, 'Analyzing backend UML diagrams with AI...');
    const backendCodePlan = await umlToBackendCodePlan({
      backendComponentDiagram: umlDiagrams.backendComponent,
      backendClassDiagram: umlDiagrams.backendClass,
      backendSequenceDiagram: umlDiagrams.backendSequence
    });
    const backendCodePlanPath = path.join(projectPath, 'backend-codeplan.json');
    await fs.writeFile(backendCodePlanPath, JSON.stringify(backendCodePlan, null, 2), 'utf-8');
    addCodeGenerationLog(jobId, `Backend CodePlan saved to ${backendCodePlanPath}`);

    // === Build the Frontend CodePlan and save ===
    addCodeGenerationLog(jobId, 'Analyzing frontend UML diagrams with AI...');
    const frontendCodePlan = await umlToFrontendCodePlan({
      frontendComponentDiagram: umlDiagrams.frontendComponent,
      frontendClassDiagram: umlDiagrams.frontendClass,
      frontendSequenceDiagram: umlDiagrams.frontendSequence
    });
    const frontendCodePlanPath = path.join(projectPath, 'frontend-codeplan.json');
    await fs.writeFile(frontendCodePlanPath, JSON.stringify(frontendCodePlan, null, 2), 'utf-8');
    addCodeGenerationLog(jobId, `Frontend CodePlan saved to ${frontendCodePlanPath}`);

    // Helper to normalize code plans
    function normalizeCodePlan(plan: any): any {
      console.log(`[AppCode] normalizeCodePlan called with plan:`, {
        planType: typeof plan,
        hasFileStructure: !!plan?.fileStructure,
        fileStructureType: typeof plan?.fileStructure,
        frontendType: typeof plan?.fileStructure?.frontend,
        backendType: typeof plan?.fileStructure?.backend,
        frontendIsArray: Array.isArray(plan?.fileStructure?.frontend),
        backendIsArray: Array.isArray(plan?.fileStructure?.backend)
      });
      
      const normalized = {
        frontendComponents: Array.isArray(plan.frontendComponents) ? plan.frontendComponents : [],
        backendComponents: Array.isArray(plan.backendComponents) ? plan.backendComponents : [],
        frontendModels: Array.isArray(plan.frontendModels) ? plan.frontendModels : [],
        backendModels: Array.isArray(plan.backendModels) ? plan.backendModels : [],
        frontendDependencies: Array.isArray(plan.frontendDependencies) ? plan.frontendDependencies : [],
        backendDependencies: Array.isArray(plan.backendDependencies) ? plan.backendDependencies : [],
        fileStructure: plan.fileStructure || { frontend: [], backend: [] },
        integration: plan.integration || { apiEndpoints: [], dataFlow: [] }
      };
      
      console.log(`[AppCode] normalizeCodePlan result:`, {
        frontendComponentsLength: normalized.frontendComponents.length,
        backendComponentsLength: normalized.backendComponents.length,
        frontendModelsLength: normalized.frontendModels.length,
        backendModelsLength: normalized.backendModels.length,
        frontendDependenciesLength: normalized.frontendDependencies.length,
        backendDependenciesLength: normalized.backendDependencies.length,
        fileStructureType: typeof normalized.fileStructure,
        frontendFilesLength: normalized.fileStructure.frontend?.length || 'undefined',
        backendFilesLength: normalized.fileStructure.backend?.length || 'undefined'
      });
      
      return normalized;
    }

    const normalizedBackendCodePlan = normalizeCodePlan(backendCodePlan);
    addCodeGenerationLog(jobId, `Normalized Backend CodePlan ${JSON.stringify(normalizedBackendCodePlan, null, 2)}`);

    const normalizedFrontendCodePlan = normalizeCodePlan(frontendCodePlan);

    // === Generate backend code first ===
    addCodeGenerationLog(jobId, 'Generating backend components...');
    await generateBackendComponents(normalizedBackendCodePlan, projectPath);
    addCodeGenerationLog(jobId, '✅ Backend components generated successfully!');

    // === Generate additional backend files if needed ===
    if ((normalizedBackendCodePlan.backendModels || []).length > 0) {
      addCodeGenerationLog(jobId, 'Generating backend models...');
      await generateBackendModelFiles(normalizedBackendCodePlan, projectPath);
      addCodeGenerationLog(jobId, '✅ Backend models generated successfully!');
    }

    // === Generate API flow files if integration is specified ===
    if (((normalizedBackendCodePlan.integration && normalizedBackendCodePlan.integration.apiEndpoints) || []).length > 0) {
      addCodeGenerationLog(jobId, 'Generating API flow files...');
      await generateApiFlowFiles(normalizedBackendCodePlan, projectPath);
      addCodeGenerationLog(jobId, '✅ API flow files generated successfully!');
    }

    // === Generate activity files for monitoring/logging ===
    addCodeGenerationLog(jobId, 'Generating activity monitoring files...');
    await generateActivityFiles(normalizedBackendCodePlan, projectPath);
    addCodeGenerationLog(jobId, '✅ Activity monitoring files generated successfully!');
    
    // === AI-powered backend build file generation ===
    addCodeGenerationLog(jobId, 'Collecting backend source files for AI build file generation...');
    const backendPath = path.join(projectPath, 'backend');
    // Recursively collect all .ts, .js, .json files in backendPath except build/config files
    async function collectBackendSourceFiles(dir: string): Promise<{ path: string; content: string }[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let files: { path: string; content: string }[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(backendPath, fullPath);
        if (entry.isDirectory()) {
          files = files.concat(await collectBackendSourceFiles(fullPath));
        } else if (/\.(ts|js|json)$/.test(entry.name) && !['package.json','tsconfig.json','.env','.env.example','Dockerfile','README.md','.gitignore','.dockerignore'].includes(entry.name)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ path: relPath, content });
        }
      }
      return files;
    }
    const backendSourceFiles = await collectBackendSourceFiles(backendPath);
    addCodeGenerationLog(jobId, `Collected ${backendSourceFiles.length} backend source files. Sending to AI for Lambda build file generation...`);
    try {
      const buildFiles = await generateBackendBuildFilesWithAI(backendSourceFiles, jobId);
      for (const buildFile of buildFiles) {
        const filePath = path.join(backendPath, buildFile.path);
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, buildFile.content, 'utf-8');
        addCodeGenerationLog(jobId, `AI-generated Lambda build file: ${buildFile.path}`);
      }
      addCodeGenerationLog(jobId, `✅ AI-powered Lambda backend build files generated successfully! (${buildFiles.length} files)`);
    } catch (buildError: any) {
      addCodeGenerationLog(jobId, `❌ AI-powered Lambda backend build files generation failed: ${buildError.message}`);
      throw new Error(`AI-powered Lambda backend build files generation failed: ${buildError.message}`);
    }
    
    addCodeGenerationLog(jobId, `✅ Backend generation completed successfully!`);
    
    // === Run Backend Build/Fix Pipeline ===
    addCodeGenerationLog(jobId, "Starting backend build and fix pipeline...");
    try {
      const backendBuildResult = await buildFixService.runBuildAndFixPipeline(projectPath, jobId);
      if (backendBuildResult.success) {
        addCodeGenerationLog(jobId, `✅ Backend build and fix pipeline completed successfully!`);
        addCodeGenerationLog(jobId, `Fixed ${backendBuildResult.fixedFiles.length} backend files in ${backendBuildResult.retryCount} attempts`);
      } else {
        addCodeGenerationLog(jobId, `⚠️ Backend build and fix pipeline completed with issues.`);
        addCodeGenerationLog(jobId, `Fixed ${backendBuildResult.fixedFiles.length} backend files in ${backendBuildResult.retryCount} attempts`);
        addCodeGenerationLog(jobId, `Remaining backend errors: ${backendBuildResult.errors.length}`);
      }
    } catch (buildError: any) {
      addCodeGenerationLog(jobId, `❌ Backend build and fix pipeline failed: ${buildError.message}`);
      throw new Error(`Backend build failed: ${buildError.message}`);
    }

    // === Test Backend API with Lambda patterns ===
    addCodeGenerationLog(jobId, "Testing backend API with Lambda patterns...");
    try {
      const apiTestResult = await testBackendAPI(projectPath, jobId);
      if (apiTestResult.success) {
        addCodeGenerationLog(jobId, `✅ Backend API test passed! Lambda structure and compilation verified.`);
        addCodeGenerationLog(jobId, `API components verified: ${apiTestResult.testedEndpoints.join(', ')}`);
      } else {
        addCodeGenerationLog(jobId, `⚠️ Backend API test failed: ${apiTestResult.error}`);
        addCodeGenerationLog(jobId, `Continuing with frontend generation, but API may not be fully functional.`);
      }
    } catch (apiError: any) {
      addCodeGenerationLog(jobId, `❌ Backend API test failed: ${apiError.message}`);
      addCodeGenerationLog(jobId, `Continuing with frontend generation, but API may not be fully functional.`);
    }

    // === Generate frontend code, passing backend plan as context for integration ===
    addCodeGenerationLog(jobId, 'Generating frontend components with backend context...');
    await generateFrontendComponents(normalizedFrontendCodePlan, projectPath, normalizedBackendCodePlan);
    addCodeGenerationLog(jobId, '✅ Frontend components generated successfully!');

    // === Generate state logic files if needed ===
    if ((normalizedBackendCodePlan.frontendComponents || []).length > 0) {
      addCodeGenerationLog(jobId, 'Generating state logic...');
      await generateStateLogicFiles(normalizedBackendCodePlan, projectPath);
      addCodeGenerationLog(jobId, '✅ State logic generated successfully!');
    }
    
    addCodeGenerationLog(jobId, `✅ Agent-based generation completed successfully!`);
    
    // === Update project record to indicate code is available ===
    try {
      const project = await getProjectById(projectId);
      if (project) {
        // Map array-based fileStructure to object-based appCode.fileStructure
        const mapFilesToCategoryObject = (files: Array<{ path: string; content: string; dependencies: string[]; description?: string }>, categoryList: string[]) => {
          console.log(`[AppCode] mapFilesToCategoryObject called with:`, {
            filesType: typeof files,
            filesIsArray: Array.isArray(files),
            filesLength: files ? files.length : 'undefined',
            categoryList
          });
          
          if (!files || !Array.isArray(files)) {
            console.error(`[AppCode] ERROR: files is not an array:`, files);
            return {};
          }
          
          const result: Record<string, Record<string, string>> = {};
          for (const category of categoryList) result[category] = {};
          
          console.log(`[AppCode] Processing ${files.length} files...`);
          
          for (const file of files) {
            console.log(`[AppCode] Processing file:`, {
              path: file.path,
              hasContent: !!file.content,
              contentLength: file.content ? file.content.length : 0,
              dependencies: file.dependencies
            });
            
            // Try to infer category from path (e.g., 'components/Button.tsx')
            const [category, ...rest] = file.path.split('/');
            const filename = rest.join('/');
            if (categoryList.includes(category) && filename) {
              result[category][filename] = file.content;
            } else {
              // Place in 'utils' if category not found
              result['utils'][file.path] = file.content;
            }
          }
          return result;
        };
        
        const frontendCategories = ['components','pages','utils','styles','assets','config'];
        const backendCategories = ['controllers','models','routes','utils','middleware','config'];
        const buildCategories = ['packageJson','tsconfig','webpackConfig','viteConfig','dockerfile','dockerCompose'];
        
        // Debug logging for code plans
        console.log(`[AppCode] Debug - normalizedFrontendCodePlan:`, {
          hasFileStructure: !!normalizedFrontendCodePlan.fileStructure,
          frontendFilesType: typeof normalizedFrontendCodePlan.fileStructure?.frontend,
          frontendFilesIsArray: Array.isArray(normalizedFrontendCodePlan.fileStructure?.frontend),
          frontendFilesLength: normalizedFrontendCodePlan.fileStructure?.frontend?.length || 'undefined'
        });
        
        console.log(`[AppCode] Debug - normalizedBackendCodePlan:`, {
          hasFileStructure: !!normalizedBackendCodePlan.fileStructure,
          backendFilesType: typeof normalizedBackendCodePlan.fileStructure?.backend,
          backendFilesIsArray: Array.isArray(normalizedBackendCodePlan.fileStructure?.backend),
          backendFilesLength: normalizedBackendCodePlan.fileStructure?.backend?.length || 'undefined'
        });
        
        // Explicitly initialize all required keys for type safety
        const emptyFrontend = {
          components: {},
          pages: {},
          utils: {},
          styles: {},
          assets: {},
          config: {}
        };
        const emptyBackend = {
          controllers: {},
          models: {},
          routes: {},
          utils: {},
          middleware: {},
          config: {}
        };
        const emptyShared = {
          types: {},
          interfaces: {},
          constants: {}
        };
        const emptyBuild = {
          packageJson: '',
          tsconfig: '',
          webpackConfig: '',
          viteConfig: '',
          dockerfile: '',
          dockerCompose: ''
        };
        
        // Merge generated content into the empty objects with null checks
        const frontendFiles = normalizedFrontendCodePlan.fileStructure?.frontend || [];
        const backendFiles = normalizedBackendCodePlan.fileStructure?.backend || [];
        
        console.log(`[AppCode] About to map files - frontend: ${frontendFiles.length}, backend: ${backendFiles.length}`);
        
        const frontend = { ...emptyFrontend, ...mapFilesToCategoryObject(frontendFiles, frontendCategories) };
        const backend = { ...emptyBackend, ...mapFilesToCategoryObject(backendFiles, backendCategories) };
        const shared = { ...emptyShared };
        const build = { ...emptyBuild };
        project.appCode = {
          appType: 'react',
          framework: 'react',
          version: '1.0.0',
          fileStructure: {
            frontend,
            backend,
            shared,
            build
          },
          frontend: {
            components: {},
            pages: {},
            utils: {}
          },
          backend: {
            controllers: {},
            models: {},
            routes: {},
            utils: {}
          },
          documentation: '',
          buildConfig: {
            dependencies: {},
            devDependencies: {},
            scripts: {},
            buildCommand: '',
            startCommand: '',
            port: 3000
          },
          validation: {
            buildErrors: [],
            runtimeErrors: [],
            missingDependencies: [],
            addedDependencies: [],
            lintErrors: [],
            typeErrors: [],
            lastValidated: new Date()
          }
        };
        await saveProject(project);
        addCodeGenerationLog(jobId, `Project record updated with appCode.`);
      } else {
        addCodeGenerationLog(jobId, `Project not found for updating appCode.`);
      }
    } catch (err) {
      addCodeGenerationLog(jobId, `Error updating project record with appCode: ${err}`);
    }

    // === Run Full Project Build/Fix Pipeline ===
    addCodeGenerationLog(jobId, "Starting full project build and fix pipeline...");
    try {
      const buildResult = await buildFixService.runBuildAndFixPipeline(projectPath, jobId);
      if (buildResult.success) {
        addCodeGenerationLog(jobId, `✅ Full project build and fix pipeline completed successfully!`);
        addCodeGenerationLog(jobId, `Fixed ${buildResult.fixedFiles.length} files in ${buildResult.retryCount} attempts`);
        // Update project with build results
        const project = await getProjectById(projectId);
        if (project && project.appCode) {
          project.appCode.validation = {
            buildErrors: [],
            runtimeErrors: [],
            missingDependencies: [],
            addedDependencies: buildResult.fixedFiles,
            lintErrors: [],
            typeErrors: [],
            lastValidated: new Date()
          };
          await saveProject(project);
          addCodeGenerationLog(jobId, `Project validation status updated.`);
        }
      } else {
        addCodeGenerationLog(jobId, `⚠️ Full project build and fix pipeline completed with issues.`);
        addCodeGenerationLog(jobId, `Fixed ${buildResult.fixedFiles.length} files in ${buildResult.retryCount} attempts`);
        addCodeGenerationLog(jobId, `Remaining errors: ${buildResult.errors.length}`);
        // Update project with build results
        const project = await getProjectById(projectId);
        if (project && project.appCode) {
          project.appCode.validation = {
            buildErrors: buildResult.errors.map(e => e.message),
            runtimeErrors: buildResult.errors.filter(e => e.type === 'runtime').map(e => e.message),
            missingDependencies: [],
            addedDependencies: buildResult.fixedFiles,
            lintErrors: buildResult.errors.filter(e => e.type === 'eslint').map(e => e.message),
            typeErrors: buildResult.errors.filter(e => e.type === 'typescript').map(e => e.message),
            lastValidated: new Date()
          };
          await saveProject(project);
          addCodeGenerationLog(jobId, `Project validation status updated with remaining issues.`);
        }
      }
    } catch (buildError: any) {
      addCodeGenerationLog(jobId, `❌ Full project build and fix pipeline failed: ${buildError.message}`);
      // Update project with build error
      const project = await getProjectById(projectId);
      if (project && project.appCode) {
        project.appCode.validation = {
          buildErrors: [buildError.message],
          runtimeErrors: [buildError.message],
          missingDependencies: [],
          addedDependencies: [],
          lintErrors: [],
          typeErrors: [],
          lastValidated: new Date()
        };
        await saveProject(project);
      }
    }
    
  } catch (error: any) {
    console.error(`[AppCode] Job ${jobId}: Error during code generation:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Log the current state of the job
    console.error(`[AppCode] Job ${jobId}: Current job state:`, {
      status: codeGenerationJobs[jobId]?.status,
      progress: codeGenerationJobs[jobId]?.progress,
      currentStep: codeGenerationJobs[jobId]?.currentStep,
      logsCount: codeGenerationJobs[jobId]?.logs?.length || 0
    });
    
    // Log the last few log entries for context
    if (codeGenerationJobs[jobId]?.logs) {
      const lastLogs = codeGenerationJobs[jobId].logs.slice(-5);
      console.error(`[AppCode] Job ${jobId}: Last 5 log entries:`, lastLogs);
    }
    
    addCodeGenerationLog(jobId, `Error during code generation: ${error.message}`);
    addCodeGenerationLog(jobId, `Error stack: ${error.stack}`);
    
    codeGenerationJobs[jobId] = {
      ...codeGenerationJobs[jobId],
      status: 'failed',
      progress: 100,
      error: error.message || "Unknown error",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

// Add function to test backend API with Lambda patterns
async function testBackendAPI(projectPath: string, jobId: string): Promise<{ success: boolean; error?: string; testedEndpoints: string[] }> {
  try {
    addCodeGenerationLog(jobId, "Starting Lambda backend API test...");
    
    const backendPath = path.join(projectPath, 'backend');
    const packageJsonPath = path.join(backendPath, 'package.json');
    
    // Check if backend directory and package.json exist
    try {
      await fs.access(packageJsonPath);
    } catch (error) {
      return { 
        success: false, 
        error: "Backend package.json not found", 
        testedEndpoints: [] 
      };
    }
    
    // Read package.json to check for Lambda-specific dependencies
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    const hasServerlessHttp = packageJson.dependencies?.['serverless-http'] || packageJson.devDependencies?.['serverless-http'];
    const hasAwsLambda = packageJson.dependencies?.['aws-lambda'] || packageJson.devDependencies?.['aws-lambda'];
    
    if (!hasServerlessHttp) {
      addCodeGenerationLog(jobId, "⚠️ serverless-http dependency not found - Lambda hosting may not work correctly");
    }
    
    if (!hasAwsLambda) {
      addCodeGenerationLog(jobId, "⚠️ aws-lambda dependency not found - Lambda types may be missing");
    }
    
    addCodeGenerationLog(jobId, `Lambda dependencies check: serverless-http=${!!hasServerlessHttp}, aws-lambda=${!!hasAwsLambda}`);
    
    // Check for Lambda handler in main entry point
    const indexPath = path.join(backendPath, 'src', 'index.ts');
    let hasLambdaHandler = false;
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      hasLambdaHandler = indexContent.includes('export const handler') || indexContent.includes('serverless-http');
      addCodeGenerationLog(jobId, `Lambda handler check: ${hasLambdaHandler ? 'Found' : 'Not found'}`);
    } catch (error) {
      addCodeGenerationLog(jobId, "⚠️ Could not read index.ts to check for Lambda handler");
    }
    
    // Test compilation instead of server startup
    addCodeGenerationLog(jobId, "Testing TypeScript compilation for Lambda...");
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { 
        cwd: backendPath,
        timeout: 30000 
      });
      
      if (stderr && stderr.trim()) {
        addCodeGenerationLog(jobId, `⚠️ TypeScript compilation warnings: ${stderr.substring(0, 200)}...`);
      } else {
        addCodeGenerationLog(jobId, "✅ TypeScript compilation successful");
      }
    } catch (compilationError: any) {
      addCodeGenerationLog(jobId, `❌ TypeScript compilation failed: ${compilationError.message}`);
      return { 
        success: false, 
        error: `Compilation failed: ${compilationError.message}`, 
        testedEndpoints: [] 
      };
    }
    
    // Test Lambda-specific files and structure
    const testedEndpoints: string[] = [];
    
    // Check for required Lambda files
    const lambdaFiles = [
      { path: 'src/index.ts', description: 'Lambda entry point' },
      { path: 'package.json', description: 'Package configuration' },
      { path: 'tsconfig.json', description: 'TypeScript configuration' }
    ];
    
    for (const file of lambdaFiles) {
      try {
        const filePath = path.join(backendPath, file.path);
        await fs.access(filePath);
        testedEndpoints.push(`${file.description} (exists)`);
        addCodeGenerationLog(jobId, `✅ ${file.description} found`);
      } catch (error) {
        addCodeGenerationLog(jobId, `⚠️ ${file.description} not found`);
      }
    }
    
    // Check for API routes structure
    const routesPath = path.join(backendPath, 'src', 'routes');
    try {
      const routesContent = await fs.readdir(routesPath);
      const routeFiles = routesContent.filter(file => file.endsWith('.ts'));
      testedEndpoints.push(`API routes (${routeFiles.length} files)`);
      addCodeGenerationLog(jobId, `✅ Found ${routeFiles.length} API route files`);
    } catch (error) {
      addCodeGenerationLog(jobId, "⚠️ API routes directory not found");
    }
    
    // Check for controllers
    const controllersPath = path.join(backendPath, 'src', 'controllers');
    try {
      const controllersContent = await fs.readdir(controllersPath);
      const controllerFiles = controllersContent.filter(file => file.endsWith('.ts'));
      testedEndpoints.push(`Controllers (${controllerFiles.length} files)`);
      addCodeGenerationLog(jobId, `✅ Found ${controllerFiles.length} controller files`);
    } catch (error) {
      addCodeGenerationLog(jobId, "⚠️ Controllers directory not found");
    }
    
    // Check for services
    const servicesPath = path.join(backendPath, 'src', 'services');
    try {
      const servicesContent = await fs.readdir(servicesPath);
      const serviceFiles = servicesContent.filter(file => file.endsWith('.ts'));
      testedEndpoints.push(`Services (${serviceFiles.length} files)`);
      addCodeGenerationLog(jobId, `✅ Found ${serviceFiles.length} service files`);
    } catch (error) {
      addCodeGenerationLog(jobId, "⚠️ Services directory not found");
    }
    
    if (testedEndpoints.length > 0) {
      addCodeGenerationLog(jobId, `✅ Lambda backend structure test completed. ${testedEndpoints.length} components verified.`);
      return { success: true, testedEndpoints };
    } else {
      return { 
        success: false, 
        error: "No Lambda components found", 
        testedEndpoints: [] 
      };
    }
    
  } catch (error: any) {
    addCodeGenerationLog(jobId, `❌ Lambda backend test failed: ${error.message}`);
    return { 
      success: false, 
      error: error.message, 
      testedEndpoints: [] 
    };
  }
}

/**
 * Fallback sequential generation when dependency-aware generation fails
 */
async function fallbackSequentialGeneration(codePlan: any, projectPath: string, jobId: string) {
  addCodeGenerationLog(jobId, 'Running fallback sequential generation...');
  
  try {
    addCodeGenerationLog(jobId, 'Generating frontend components...');
    await generateFrontendComponents(codePlan, projectPath);
    addCodeGenerationLog(jobId, 'Frontend components generated.');
  } catch (e) {
    addCodeGenerationLog(jobId, `Error generating frontend components: ${e}`);
  }
  
  try {
    addCodeGenerationLog(jobId, 'Generating backend components...');
    await generateBackendComponents(codePlan, projectPath);
    addCodeGenerationLog(jobId, 'Backend components generated.');
  } catch (e) {
    addCodeGenerationLog(jobId, `Error generating backend components: ${e}`);
  }

  // === Generate Backend Models ===
  addCodeGenerationLog(jobId, "Generating backend models...");
  const backendModelFiles = await generateBackendModelFiles(codePlan, projectPath);
  addCodeGenerationLog(jobId, `Generated ${backendModelFiles.length} backend model files`);

  // === Generate State Logic ===
  addCodeGenerationLog(jobId, "Generating state logic...");
  const stateLogicFiles = await generateStateLogicFiles(codePlan, projectPath);
  addCodeGenerationLog(jobId, `Generated ${stateLogicFiles.length} state logic files`);

  // === Generate API Flows ===
  addCodeGenerationLog(jobId, "Generating API flows...");
  const apiFlowFiles = await generateApiFlowFiles(codePlan, projectPath);
  addCodeGenerationLog(jobId, `Generated ${apiFlowFiles.length} API flow files`);

  // === Generate Activities ===
  addCodeGenerationLog(jobId, "Generating activities...");
  const activityFiles = await generateActivityFiles(codePlan, projectPath);
  addCodeGenerationLog(jobId, `Generated ${activityFiles.length} activity files`);
}

// Add the streaming logs endpoint
export const getCodeGenerationLogs = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  if (!jobId || !codeGenerationJobs[jobId]) {
    res.status(404).json({ error: "Code generation job not found" });
    return;
  }

  const job = codeGenerationJobs[jobId];
  memoryManager.touchJob(job);
  
  res.json({
    jobId,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    logs: job.logs,
    result: job.result,
    error: job.error
  });
};

// Add the streaming logs endpoint with Server-Sent Events
export const streamCodeGenerationLogs = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  if (!jobId || !codeGenerationJobs[jobId]) {
    res.status(404).json({ error: "Code generation job not found" });
    return;
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const job = codeGenerationJobs[jobId];
  let lastLogCount = job.logs.length;

  // Send initial state
  res.write(`data: ${JSON.stringify({
    jobId,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    logs: job.logs,
    result: job.result,
    error: job.error
  })}\n\n`);

  // Poll for updates every 500ms
  const interval = setInterval(() => {
    if (!codeGenerationJobs[jobId]) {
      clearInterval(interval);
      res.end();
      return;
    }

    const currentJob = codeGenerationJobs[jobId];
    
    // Only send if there are new logs or status changed
    if (currentJob.logs.length > lastLogCount || 
        currentJob.status !== job.status || 
        currentJob.progress !== job.progress ||
        currentJob.currentStep !== job.currentStep) {
      
      res.write(`data: ${JSON.stringify({
        jobId,
        status: currentJob.status,
        progress: currentJob.progress,
        currentStep: currentJob.currentStep,
        logs: currentJob.logs,
        result: currentJob.result,
        error: currentJob.error
      })}\n\n`);
      
      lastLogCount = currentJob.logs.length;
    }

    // Stop streaming if job is completed or failed
    if (currentJob.status === 'completed' || currentJob.status === 'failed') {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
};










