// src/controllers/iacController.ts
import express from "express";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import { generateUmlFromPrompt } from "../utils/umlGenerator";
import { databaseService, Job } from "../services/databaseService";
import { generateInfrastructureTiers as generateTiers, generateDetailedInfrastructure, InfrastructureOptions, InfrastructureTier } from "../services/infrastructureTierService";
import fs from 'fs/promises';
import path from 'path';
// COMMENTED OUT: Terraform validator imports - causing more issues than they solve
// import { validateAndFixTerraformCode, validateTerraformCode, formatTerraformCode } from '../utils/terraformValidator';
dotenv.config();

interface InfrastructureJob extends Job {
  umlDiagrams?: any;
  terraformCode?: string;
  deploymentStatus?: any;
  infrastructureTiers?: InfrastructureOptions;
  selectedTier?: InfrastructureTier;
}

function generateJobId() {
  return `infra-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// Main infrastructure workflow endpoint
export const createInfrastructure = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId: providedProjectId, autoDeploy = false, selectedArchitecture } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  
  // Get userId from request (from auth middleware or request body)
  const userId = (req as any).user?.id || req.body.userId || 'anonymous';
  
  // Generate projectId if not provided
  const projectId = providedProjectId || `project-${Date.now()}`;
  
  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: InfrastructureJob = {
    id: jobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: selectedArchitecture ? "generating-terraform" : "analyzing",
    prompt,
    projectId,
    userId,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };
  
  databaseService.saveJob(job);
  
  // If we have a selected architecture from Smart Architect, use it directly
  if (selectedArchitecture) {
    processSelectedArchitectureDeployment(jobId, selectedArchitecture, autoDeploy);
  } else {
    // Start background infrastructure workflow
    processInfrastructureWorkflow(jobId, prompt, projectId, autoDeploy);
  }
  
  res.json({ jobId, status: "accepted", message: "Infrastructure creation started" });
};

// NEW: Generate infrastructure tiers with cost analysis
export const generateInfrastructureTiers = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId: providedProjectId, region = 'us-east-1' } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  
  // Get userId from request (from auth middleware or request body)
  const userId = (req as any).user?.id || req.body.userId || 'anonymous';
  
  // Generate projectId if not provided
  const projectId = providedProjectId || `project-${Date.now()}`;
  
  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: InfrastructureJob = {
    id: jobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: "generating-tiers",
    prompt,
    projectId,
    userId,
    region,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };
  
  databaseService.saveJob(job);
  
  // Start background tier generation
  processInfrastructureTiersJob(jobId, prompt, projectId, region);
  res.json({ jobId, status: "accepted", message: "Infrastructure tiers generation started" });
};

// NEW: Generate detailed infrastructure for selected tier
export const generateDetailedTier = async (req: Request, res: Response): Promise<void> => {
  const { jobId, tierType, prompt } = req.body;
  if (!jobId || !tierType || !prompt) {
    res.status(400).json({ error: "Job ID, tier type, and prompt are required" });
    return;
  }

  const job = databaseService.getJob(jobId) as InfrastructureJob;
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const newJobId = generateJobId();
  const now = new Date().toISOString();
  
  const detailedJob: InfrastructureJob = {
    id: newJobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: "generating-detailed",
    prompt,
    projectId: job.projectId,
    userId: (req as any).user?.id,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };

  databaseService.saveJob(detailedJob);

  // Get region from the original job
  const region = job.region || 'us-east-1';
  
  // Start background detailed generation
  processDetailedTierGeneration(newJobId, prompt, tierType, region);
  res.json({ jobId: newJobId, status: "accepted", message: "Detailed infrastructure generation started" });
};

// NEW: Deploy selected infrastructure tier
export const deploySelectedTier = async (req: Request, res: Response): Promise<void> => {
  const { jobId, selectedTierIndex } = req.body;
  if (!jobId || selectedTierIndex === undefined) {
    res.status(400).json({ error: "Job ID and selected tier index are required" });
    return;
  }

  const job = databaseService.getJob(jobId) as InfrastructureJob;
  if (!job || !job.infrastructureTiers) {
    res.status(404).json({ error: "Job not found or no infrastructure tiers available" });
    return;
  }

  const tierKeys = ['lowCost', 'mediumCost', 'highCost'] as const;
  const selectedTierKey = tierKeys[selectedTierIndex];
  const selectedTier = job.infrastructureTiers[selectedTierKey];

  if (!selectedTier) {
    res.status(400).json({ error: "Invalid tier selection" });
    return;
  }

  // Update job with selected tier
  job.selectedTier = selectedTier;
  job.terraformCode = selectedTier.terraformCode;
  job.phase = "deploying";
  job.updatedAt = new Date().toISOString();
  databaseService.saveJob(job);

  // Start deployment
  processSelectedTierDeployment(jobId, selectedTier);
  res.json({ jobId, status: "accepted", message: "Infrastructure deployment started" });
};

// Legacy endpoint for backward compatibility
export const generateIaC = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId, umlDiagrams } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  
  // Get userId from request (from auth middleware or request body)
  const userId = (req as any).user?.id || req.body.userId || 'anonymous';
  
  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: InfrastructureJob = {
    id: jobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: "generating-terraform",
    prompt,
    projectId,
    userId,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };
  
  databaseService.saveJob(job);
  
  // Start background job
  processIaCJob(jobId, prompt, projectId, umlDiagrams);
  res.json({ jobId, status: "accepted" });
};

async function processSelectedArchitectureDeployment(jobId: string, selectedArchitecture: any, autoDeploy: boolean) {
  try {
    console.log(`[Infrastructure] Processing selected architecture deployment for jobId=${jobId}`);
    
    // Update job status
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 50;
      job.phase = "generating-terraform";
      job.updatedAt = new Date().toISOString();
      databaseService.saveJob(job);
    }

    // Use the infrastructure code from the selected architecture
    const terraformCode = selectedArchitecture.infrastructureCode || '';
    
    // Removed verbose terraform code length logging
    
    if (!terraformCode) {
      throw new Error('No infrastructure code found in selected architecture');
    }

    // Update job with terraform code
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.progress = 80;
      job.phase = "deploying";
      job.terraformCode = terraformCode;
      job.result = JSON.stringify({
        umlDiagrams: null,
        terraformCode,
        deploymentStatus: null
      });
      job.updatedAt = new Date().toISOString();
      databaseService.saveJob(job);
    }

    // Deploy if autoDeploy is enabled
    if (autoDeploy) {
      console.log(`[Infrastructure] Auto-deploying infrastructure for jobId=${jobId}`);
      const deploymentResult = await deployInfrastructure(job.projectId || `project-${Date.now()}`, terraformCode);
      
      job = databaseService.getJob(jobId) as InfrastructureJob;
      if (job) {
        job.progress = 100;
        job.status = "completed";
        job.phase = "completed";
        job.deploymentStatus = deploymentResult;
        job.result = JSON.stringify({
          umlDiagrams: null,
          terraformCode,
          deploymentStatus: deploymentResult
        });
        job.updatedAt = new Date().toISOString();
        databaseService.saveJob(job);
      }
    } else {
      // Mark as completed without deployment
      job = databaseService.getJob(jobId) as InfrastructureJob;
      if (job) {
        job.progress = 100;
        job.status = "completed";
        job.phase = "completed";
        job.updatedAt = new Date().toISOString();
        databaseService.saveJob(job);
      }
    }

    console.log(`[Infrastructure] Selected architecture deployment completed for jobId=${jobId}`);

  } catch (error: any) {
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

async function processInfrastructureWorkflow(jobId: string, prompt: string, projectId: string, autoDeploy: boolean) {
  try {
    // Phase 1: Analyzing and generating UML diagrams
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 10;
      job.phase = "generating-uml";
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure] Phase 1: Generating UML diagrams for jobId=${jobId}`);
    const umlDiagrams = await generateUmlFromPrompt(prompt);
    
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.progress = 30;
      job.umlDiagrams = umlDiagrams;
      // Store umlDiagrams in the result field for database persistence
      job.result = JSON.stringify({
        umlDiagrams
      });
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    // Phase 2: Generating Terraform code
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.progress = 40;
      job.phase = "generating-terraform";
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure] Phase 2: Generating Terraform code for jobId=${jobId}`);
    const terraformCode = await generateTerraformCode(prompt, umlDiagrams);
    
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.progress = 70;
      job.terraformCode = terraformCode;
      // Store terraformCode in the result field for database persistence
      // Use the original umlDiagrams variable to avoid "[object Object]" issues
      job.result = JSON.stringify({
        terraformCode,
        umlDiagrams: umlDiagrams
      });
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    // Phase 3: Deploy infrastructure (if autoDeploy is enabled)
    if (autoDeploy && projectId) {
      job = databaseService.getJob(jobId) as InfrastructureJob;
      if (job) {
        job.progress = 80;
        job.phase = "deploying";
        job.updatedAt = now;
        job.lastAccessed = now;
        databaseService.saveJob(job);
      }

      console.log(`[Infrastructure] Phase 3: Deploying infrastructure for jobId=${jobId}`);
      const deploymentResult = await deployInfrastructure(projectId, terraformCode);
      
      job = databaseService.getJob(jobId) as InfrastructureJob;
      if (job) {
        job.status = "completed";
        job.progress = 100;
        job.phase = "completed";
        job.deploymentStatus = deploymentResult;
        // Update result field to include deployment status
        const currentResult = job.result ? JSON.parse(job.result) : {};
        job.result = JSON.stringify({
          ...currentResult,
          deploymentStatus: deploymentResult
        });
        job.updatedAt = now;
        job.lastAccessed = now;
        databaseService.saveJob(job);
      }
    } else {
      // Store terraform code for manual deployment
      if (projectId && terraformCode) {
        const workspaceDir = path.join(__dirname, '..', '..', 'terraform-runner', 'workspace', projectId);
        await fs.mkdir(workspaceDir, { recursive: true });
        const tfPath = path.join(workspaceDir, 'terraform.tf');
        await fs.writeFile(tfPath, terraformCode, 'utf-8');
      }

      job = databaseService.getJob(jobId) as InfrastructureJob;
      if (job) {
        job.status = "completed";
        job.progress = 100;
        job.phase = "completed";
        // The result field should already contain both terraformCode and umlDiagrams
        // No need to parse and merge - just ensure it's properly formatted
        if (!job.result) {
          // If result is missing, recreate it with both terraformCode and umlDiagrams
          job.result = JSON.stringify({
            terraformCode: job.terraformCode,
            umlDiagrams: umlDiagrams
          });
          console.log(`[Infrastructure] Recreated result with terraformCode and umlDiagrams`);
        }
        // Result is already properly formatted, no need to update
        job.updatedAt = now;
        job.lastAccessed = now;
        databaseService.saveJob(job);
      }
    }

  } catch (error: any) {
    console.error(`[Infrastructure] Job ${jobId} failed:`, error);
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      // Better error handling to avoid "[object Object]" issues
      let errorMessage = "Unknown error";
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = error.message || error.toString() || "Unknown error";
      }
      job.error = errorMessage;
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

async function generateTerraformCode(prompt: string, umlDiagrams: any): Promise<string> {
  console.log(`[Terraform] Starting generation for prompt: ${prompt.substring(0, 100)}...`);
  console.log(`[Terraform] UML diagrams type:`, typeof umlDiagrams);
  console.log(`[Terraform] UML diagrams keys:`, umlDiagrams ? Object.keys(umlDiagrams) : 'null');

  const systemPrompt = `You are an AI assistant specialized in generating Infrastructure as Code (IaC) using Terraform for AWS resources based on user prompts and UML diagrams.

Your task is to:
1. Analyze the user's prompt and UML diagrams to understand the application architecture
2. Generate comprehensive Terraform code for AWS infrastructure
3. Include all necessary AWS resources (VPC, EC2, RDS, S3, Lambda, etc.)
4. Follow AWS best practices for security, scalability, and cost optimization
5. Include proper variable definitions, outputs, and documentation

CRITICAL AWS REQUIREMENTS:
- Use AWS provider version "~> 5.0" (latest stable)
- For S3 buckets: Do NOT use bucket_ownership_controls blocks. Do NOT set ACLs. Use simple bucket configuration only.
- For Lambda functions: Use supported runtimes like "nodejs18.x", "nodejs20.x", "python3.9", "python3.10", "python3.11", or "python3.12". Do NOT use deprecated runtimes like "nodejs14.x".
- For API Gateway: Use REST API or HTTP API as appropriate
- For RDS: Use supported engine versions
- Include proper IAM roles and permissions
- Use proper security groups and VPC configurations
- Do NOT use any ownership controls or ACL configurations for S3 buckets

Return only valid Terraform code with proper syntax. Do not include any explanations or markdown formatting.

UML Diagrams Context:
${JSON.stringify(umlDiagrams, null, 2)}

User Requirements:
${prompt}`;

  // Use OpenAI GPT-4o as primary, Anthropic Claude as fallback
  let response;
  try {
    console.log(`[Terraform] Attempting OpenAI request...`);
    response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: "user", content: systemPrompt }
      ]
    });
    console.log(`[Terraform] OpenAI request successful`);
    console.log(`[Terraform] OpenAI response type:`, typeof response);
    console.log(`[Terraform] OpenAI response keys:`, Object.keys(response));
      } catch (openaiError: any) {
      console.log(`[Terraform] OpenAI failed, trying Anthropic:`, openaiError);
    try {
      response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: "user", content: systemPrompt }
        ]
      });
      console.log(`[Terraform] Anthropic fallback successful`);
      console.log(`[Terraform] Anthropic response type:`, typeof response);
      console.log(`[Terraform] Anthropic response keys:`, Object.keys(response));
    } catch (anthropicError: any) {
      console.error(`[Terraform] Both AI providers failed:`, { openaiError, anthropicError });
      throw new Error(`AI providers failed: ${openaiError?.message || 'OpenAI failed'}, ${anthropicError?.message || 'Anthropic failed'}`);
    }
  }

  // Handle response based on provider with better error handling
  let terraformCode: string;
  try {
    if ('choices' in response) {
      // OpenAI response
      console.log(`[Terraform] Processing OpenAI response...`);
      const content = response.choices[0]?.message?.content;
      console.log(`[Terraform] OpenAI content type:`, typeof content);
      terraformCode = content || "";
    } else {
      // Anthropic response
      console.log(`[Terraform] Processing Anthropic response...`);
      const content = response.content[0]?.type === 'text' ? response.content[0].text : "";
      console.log(`[Terraform] Anthropic content type:`, typeof content);
      terraformCode = content;
    }

    if (!terraformCode || typeof terraformCode !== 'string') {
      console.error(`[Terraform] Invalid response format:`, { terraformCode, type: typeof terraformCode });
      throw new Error(`Invalid AI response format: expected string, got ${typeof terraformCode}`);
    }

    // Clean up the response to ensure it's valid Terraform code
    terraformCode = terraformCode.replace(/```terraform\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove hcl language indicator if present
    terraformCode = terraformCode.replace(/^hcl\s*\n?/gm, '');
    
    // COMMENTED OUT: Validate and fix the Terraform code - causing more issues than it solves
    // const validation = validateTerraformCode(terraformCode);
    // if (!validation.isValid) {
    //   console.warn(`[Terraform] Validation warnings:`, validation.errors);
    // }
    
    // COMMENTED OUT: Apply fixes to ensure compatibility - causing more issues than it solves
    // terraformCode = validateAndFixTerraformCode(terraformCode);
    
    // Removed verbose final code length logging
    
    return terraformCode;
  } catch (parseError: any) {
    console.error(`[Terraform] Error parsing AI response:`, parseError);
    throw new Error(`Failed to parse AI response: ${parseError?.message || 'Unknown parsing error'}`);
  }
}

async function deployInfrastructure(projectId: string, terraformCode: string): Promise<any> {
  console.log(`[Deploy] Starting deployment for project ${projectId}`);
  console.log(`[Deploy] Terraform code length: ${terraformCode.length} characters`);
  
  // COMMENTED OUT: Format and validate terraform code - causing more issues than it solves
  // const formattedCode = formatTerraformCode(terraformCode);
  
  try {
    // Store terraform code
    const workspaceDir = path.join(__dirname, '..', '..', 'terraform-runner', 'workspace', projectId);
    await fs.mkdir(workspaceDir, { recursive: true });
    const tfPath = path.join(workspaceDir, 'terraform.tf');
    await fs.writeFile(tfPath, terraformCode, 'utf-8');
    console.log(`[Deploy] Terraform code written to: ${tfPath}`);

    // Call terraform-runner service to deploy
    const terraformRunnerUrl = process.env.TERRAFORM_RUNNER_URL || 'http://localhost:8000';
    console.log(`[Deploy] Calling terraform-runner at: ${terraformRunnerUrl}/deploy`);
    
    const response = await fetch(`${terraformRunnerUrl}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        userId: 'system' // For now, use system user
      })
    });

    console.log(`[Deploy] Terraform-runner response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Deploy] Terraform-runner error response: ${errorText}`);
      throw new Error(`Terraform deployment failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Deploy] Terraform-runner success response:`, result);
    return result;
  } catch (error: any) {
    console.error('[Deploy] Error in deployInfrastructure:', {
      error: error.message,
      stack: error.stack,
      projectId,
      terraformCodeLength: terraformCode.length
    });
    throw error;
  }
}

async function callTerraformDestroy(projectId: string): Promise<any> {
  // Call terraform-runner service to destroy
  const terraformRunnerUrl = process.env.TERRAFORM_RUNNER_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${terraformRunnerUrl}/destroy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        userId: 'system' // For now, use system user
      })
    });

    if (!response.ok) {
      throw new Error(`Terraform destruction failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[Destroy] Error calling terraform-runner:', error);
    throw error;
  }
}

async function processIaCJob(jobId: string, prompt: string, projectId: string, umlDiagrams: any) {
  try {
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 10;
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    const terraformCode = await generateTerraformCode(prompt, umlDiagrams);

    // === Store terraform.tf in terraform-runner workspace ===
    if (projectId && terraformCode) {
      // COMMENTED OUT: Format terraform code - causing more issues than it solves
      // const formattedCode = formatTerraformCode(terraformCode);
      const workspaceDir = path.join(__dirname, '..', '..', 'terraform-runner', 'workspace', projectId);
      await fs.mkdir(workspaceDir, { recursive: true });
      const tfPath = path.join(workspaceDir, 'terraform.tf');
      await fs.writeFile(tfPath, terraformCode, 'utf-8');
    }

    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.result = JSON.stringify({ terraformCode });
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }
  } catch (error: any) {
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

export const getInfrastructureJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  const job = databaseService.getJob(jobId);
  
  if (!jobId || !job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  
  // Map Job to InfrastructureJob and extract terraformCode from result
  // job.result is already parsed as an object by the database service
  const result = job.result as any;
  const infrastructureJob: InfrastructureJob = {
    ...job,
    terraformCode: result && result.terraformCode,
    umlDiagrams: result && result.umlDiagrams,
    deploymentStatus: result && result.deploymentStatus
  };
  
  // Update last accessed time
  infrastructureJob.lastAccessed = new Date().toISOString();
  databaseService.saveJob(infrastructureJob);
  
  res.json(infrastructureJob);
};

export const getUserInfrastructureJobs = async (req: Request, res: Response): Promise<void> => {
  console.log('[getUserInfrastructureJobs] Controller called');
  
  try {
    const userId = (req as any).user?.id;
    console.log('[getUserInfrastructureJobs] User ID:', userId);
    
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const jobs = databaseService.getJobsByUserId(userId, 'infrastructure');
    console.log('[getUserInfrastructureJobs] Found jobs:', jobs.length);
    
    // Group jobs by project
    const projectGroups = new Map<string, any>();
    
    jobs.forEach(job => {
      const projectId = job.projectId || job.id.replace('infra-', 'project-');
      const result = job.result as any;
      
      if (!projectGroups.has(projectId)) {
        projectGroups.set(projectId, {
          projectId,
          jobs: [],
          latestJob: null,
          status: 'unknown',
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          terraformCode: null,
          umlDiagrams: null,
          deploymentStatus: null,
          prompt: job.prompt
        });
      }
      
      const project = projectGroups.get(projectId);
      project.jobs.push(job);
      
      // Update latest job and status
      if (!project.latestJob || new Date(job.updatedAt) > new Date(project.latestJob.updatedAt)) {
        project.latestJob = job;
        project.status = job.status;
        project.updatedAt = job.updatedAt;
      }
      
      // Collect project data from jobs
      if (result) {
        // Removed verbose result logging - was dumping full terraform code
        if (result.terraformCode && !project.terraformCode) {
          project.terraformCode = result.terraformCode;
        }
        if (result.umlDiagrams && !project.umlDiagrams) {
          project.umlDiagrams = result.umlDiagrams;
        }
        if (result.deploymentStatus && !project.deploymentStatus) {
          project.deploymentStatus = result.deploymentStatus;
        }
      }
    });
    
    // Convert to array and sort by latest update
    const projects = Array.from(projectGroups.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    console.log('[getUserInfrastructureJobs] Returning projects:', projects.length);
    res.json({ projects });
  } catch (error) {
    console.error('Error getting user infrastructure jobs:', error);
    res.status(500).json({ error: "Failed to get infrastructure jobs" });
  }
};

// NEW: Get single project by ID - O(1) lookup
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ error: "Project ID is required" });
      return;
    }

    const project = databaseService.getProjectById(projectId, userId);
    
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    console.log(`[getProjectById] Found project: ${projectId} (status: ${project.status})`);
    res.json({ project });
  } catch (error) {
    console.error('Error getting project by ID:', error);
    res.status(500).json({ error: "Failed to get project" });
  }
};

// Deploy existing infrastructure
export const deployExistingInfrastructure = async (req: Request, res: Response): Promise<void> => {
  const { projectId, retry = false } = req.body;
  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  // If this is a retry, check if the project has failed status
  if (retry) {
    const allJobs = databaseService.getAllJobs();
    const failedJob = allJobs.find(j => 
      j.projectId === projectId && 
      j.type === 'infrastructure' && 
      j.status === 'failed'
    );
    
    if (!failedJob) {
      res.status(400).json({ error: "No failed deployment found for this project. Cannot retry." });
      return;
    }
  }

  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: InfrastructureJob = {
    id: jobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: "deploying",
    projectId,
    userId: (req as any).user?.id,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };

  databaseService.saveJob(job);

  // Start background deployment
  processDeploymentJob(jobId, projectId, retry);
  res.json({ jobId, status: "accepted", message: retry ? "Infrastructure deployment retry started" : "Infrastructure deployment started" });
};

// Retry failed deployment
export const retryFailedDeployment = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  // Check if there's a failed deployment for this project
  const allJobs = databaseService.getAllJobs();
  const failedJob = allJobs.find(j => 
    j.projectId === projectId && 
    j.type === 'infrastructure' && 
    j.status === 'failed'
  );
  
  if (!failedJob) {
    res.status(400).json({ error: "No failed deployment found for this project. Cannot retry." });
    return;
  }

  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: InfrastructureJob = {
    id: jobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: "deploying",
    projectId,
    userId: (req as any).user?.id,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };

  databaseService.saveJob(job);

  // Start background deployment with retry flag
  processDeploymentJob(jobId, projectId, true);
  res.json({ jobId, status: "accepted", message: "Infrastructure deployment retry started" });
};

async function processDeploymentJob(jobId: string, projectId: string, isRetry: boolean = false) {
  let terraformCode: string = '';
  
  try {
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 50;
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    // Get Terraform code from selected tier or fallback to original job
    
    // First, try to get Terraform code from selected tier (new tier-based system)
    const allJobs = databaseService.getAllJobs();
    const selectedTierJob = allJobs.find(j => {
      try {
        return j.projectId === projectId && 
          j.type === 'infrastructure' && 
          j.result && 
          typeof j.result === 'string' &&
          JSON.parse(j.result).selectedTier?.terraformCode;
      } catch (e) {
        console.log(`[Deploy] Failed to parse result for job ${j.id}:`, e);
        return false;
      }
    });
    
    if (selectedTierJob && selectedTierJob.result) {
      try {
        const result = JSON.parse(selectedTierJob.result);
        terraformCode = result.selectedTier?.terraformCode || '';
        if (terraformCode) {
          console.log(`[Deploy] Found Terraform code from selected tier for project ${projectId}`);
        }
      } catch (e) {
        console.log(`[Deploy] Failed to parse selectedTierJob result:`, e);
      }
    }
    
    // If no selected tier Terraform code, try the original job (fallback)
    if (!terraformCode) {
      const originalJob = allJobs.find(j => {
        try {
          return j.projectId === projectId && 
            j.type === 'infrastructure' && 
            j.result && 
            typeof j.result === 'string' &&
            JSON.parse(j.result).terraformCode;
        } catch (e) {
          console.log(`[Deploy] Failed to parse result for job ${j.id}:`, e);
          return false;
        }
      });
      
      if (originalJob && originalJob.result) {
        try {
          const result = JSON.parse(originalJob.result);
          terraformCode = result.terraformCode || '';
          if (terraformCode) {
            console.log(`[Deploy] Found Terraform code from original job for project ${projectId}`);
          }
        } catch (e) {
          console.log(`[Deploy] Failed to parse originalJob result:`, e);
        }
      }
    }
    
    // If still no Terraform code, check if terraform.tf file exists
    if (!terraformCode) {
      const tfPath = path.join(__dirname, '..', '..', 'terraform-runner', 'workspace', projectId, 'terraform.tf');
      try {
        terraformCode = await fs.readFile(tfPath, 'utf-8');
        console.log(`[Deploy] Found terraform.tf file for project ${projectId}`);
      } catch (fileError: any) {
        console.log(`[Deploy] Terraform file not found at ${tfPath}`);
      }
    }
    
    // If no Terraform code found anywhere, throw error
    if (!terraformCode) {
      throw new Error(`No Terraform code found for project ${projectId}. Please generate infrastructure first.`);
    }

    console.log(`[Deploy] Starting deployment for project ${projectId} with ${terraformCode.length} chars of Terraform code`);
    const deploymentResult = await deployInfrastructure(projectId, terraformCode);

    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.deploymentStatus = deploymentResult;
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }
  } catch (error: any) {
    console.error(`[Deploy] Deployment failed for project ${projectId}:`, {
      error: error.message,
      stack: error.stack,
      jobId,
      projectId,
      terraformCodeLength: terraformCode?.length || 0
    });
    
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

// Destroy infrastructure
export const destroyInfrastructure = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.body;
  if (!projectId) {
    res.status(400).json({ error: "Project ID is required" });
    return;
  }

  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: InfrastructureJob = {
    id: jobId,
    type: 'infrastructure',
    status: "pending", 
    progress: 0,
    phase: "destroying",
    projectId,
    userId: (req as any).user?.id,
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };

  databaseService.saveJob(job);

  // Start background destruction
  processDestructionJob(jobId, projectId);
  res.json({ jobId, status: "accepted", message: "Infrastructure destruction started" });
};

async function processDestructionJob(jobId: string, projectId: string) {
  try {
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 50;
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    const destructionResult = await callTerraformDestroy(projectId);

    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.deploymentStatus = destructionResult;
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }
  } catch (error: any) {
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

// NEW: Process infrastructure tiers generation
async function processInfrastructureTiersJob(jobId: string, prompt: string, projectId: string, region: string = 'us-east-1') {
  try {
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 20;
      job.phase = "generating-tiers";
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure Tiers] Generating three infrastructure tiers for jobId=${jobId} in region ${region}`);
    
    // Generate three infrastructure tiers with region
    const infrastructureTiers = await generateTiers(prompt, region);
    
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.phase = "tiers-ready";
      job.infrastructureTiers = infrastructureTiers;
      job.result = JSON.stringify({
        infrastructureTiers,
        umlDiagrams: null,
        terraformCode: null,
        deploymentStatus: null
      });
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure Tiers] Successfully generated three tiers for jobId=${jobId}`);

  } catch (error: any) {
    console.error(`[Infrastructure Tiers] Job ${jobId} failed:`, error);
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

// NEW: Process detailed tier generation
async function processDetailedTierGeneration(jobId: string, prompt: string, tierType: 'lowCost' | 'mediumCost' | 'highCost', region: string = 'us-east-1') {
  try {
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 20;
      job.phase = "generating-detailed";
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure Tiers] Generating detailed infrastructure for ${tierType} for jobId=${jobId} in region ${region}`);
    
    // Generate detailed infrastructure for the selected tier with region
    const detailedTier = await generateDetailedInfrastructure(prompt, tierType, region);
    
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.phase = "detailed-ready";
      job.selectedTier = detailedTier;
      job.result = JSON.stringify({
        selectedTier: detailedTier,
        umlDiagrams: null,
        terraformCode: detailedTier.terraformCode,
        deploymentStatus: null
      });
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure Tiers] Successfully generated detailed infrastructure for ${tierType} for jobId=${jobId}`);

  } catch (error: any) {
    console.error(`[Infrastructure Tiers] Detailed generation job ${jobId} failed:`, error);
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

// NEW: Process selected tier deployment
async function processSelectedTierDeployment(jobId: string, selectedTier: InfrastructureTier) {
  try {
    console.log(`[Infrastructure Tiers] Processing selected tier deployment for jobId=${jobId}`);
    
    // Update job status
    let job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "processing";
      job.progress = 50;
      job.phase = "deploying";
      job.updatedAt = new Date().toISOString();
      databaseService.saveJob(job);
    }

    const terraformCode = selectedTier.terraformCode;
    
    if (!terraformCode) {
      throw new Error('No Terraform code found in selected tier');
    }

    // Deploy the selected tier
    const projectId = job?.projectId || `project-${Date.now()}`;
    const deploymentResult = await deployInfrastructure(projectId, terraformCode);
    
    job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.progress = 100;
      job.status = "completed";
      job.phase = "completed";
      job.deploymentStatus = deploymentResult;
      job.result = JSON.stringify({
        infrastructureTiers: job.infrastructureTiers,
        umlDiagrams: null,
        terraformCode,
        deploymentStatus: deploymentResult
      });
      job.updatedAt = new Date().toISOString();
      databaseService.saveJob(job);
    }

    console.log(`[Infrastructure Tiers] Selected tier deployment completed for jobId=${jobId}`);

  } catch (error: any) {
    const job = databaseService.getJob(jobId) as InfrastructureJob;
    if (job) {
      job.status = "failed";
      job.progress = 100;
      job.error = error.message || "Unknown error";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }
  }
}

// Delete project (only if not provisioned)
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    console.log(`[IAC Controller] Deleting project ${projectId} for user ${userId}`);

    // Get project to check if it's provisioned
    const project = await databaseService.getProjectById(projectId, userId);
    
    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found'
      });
      return;
    }

    // Check if project has been provisioned
    const hasBeenProvisioned = project.deploymentStatus && 
      (project.deploymentStatus.status === 'deployed' || 
       project.deploymentStatus.status === 'deploying' ||
       project.deploymentStatus.status === 'failed_deployment');

    if (hasBeenProvisioned) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete provisioned projects. Please destroy the infrastructure first.',
        projectId,
        deploymentStatus: project.deploymentStatus
      });
      return;
    }

    // Delete the project and associated jobs
    databaseService.deleteProject(projectId);

    res.json({
      success: true,
      message: 'Project deleted successfully',
      projectId
    });

  } catch (error: any) {
    console.error('[IAC Controller] Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
};