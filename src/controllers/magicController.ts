import { Request, Response } from "express";
import OpenAI from "openai";
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
import { getProjectById, saveProject } from '../utils/projectFileStore';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_SECRET_KEY,
});

// Enhanced job interface for the new structured workflow
interface MagicJob extends MemoryOptimizedJob {
  status: string;
  progress: number;
  phase: 'analysis' | 'user_confirmation' | 'uml_generation' | 'infra_generation' | 'app_generation' | 'infra_provision' | 'app_deployment' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
  userPrompt?: string;
  targetCustomers?: string;
  analysisResult?: any;
  userConfirmed?: boolean;
  rejectionReason?: string;
  umlDiagrams?: any;
  infraCode?: string;
  appCode?: any;
  deploymentResult?: any;
}

const conceptJobs: Record<string, MagicJob> = {};
const appCreationJobs: Record<string, MagicJob> = {};

// Set up memory management for job stores
memoryManager.setupJobStoreCleanup(conceptJobs, "conceptJobs", 40 * 60 * 1000, 25); // 40 min, max 25 jobs
memoryManager.setupJobStoreCleanup(appCreationJobs, "appCreationJobs", 60 * 60 * 1000, 20); // 60 min, max 20 jobs

function generateJobId(prefix: string = 'magic'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// AI request wrapper with retry logic
async function makeAIRequest(prompt: string, systemPrompt?: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try OpenAI first
      if (process.env.OPENAI_API_KEY) {
        try {
          const messages: any[] = systemPrompt 
            ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
            : [{ role: "user", content: prompt }];
            
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            max_tokens: 4000,
            temperature: 0.3,
          });
          
          return response.choices[0]?.message?.content?.trim() || "";
        } catch (error: any) {
          if (error.message?.includes('429') || error.message?.includes('quota')) {
            console.log(`[Magic Flow] OpenAI rate limit, trying Anthropic...`);
            return await makeAnthropicRequest(prompt, systemPrompt);
          }
          lastError = error;
        }
      }
      
      // Fallback to Anthropic
      if (process.env.ANTHROPIC_SECRET_KEY) {
        return await makeAnthropicRequest(prompt, systemPrompt);
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
      
    } catch (error: any) {
      lastError = error;
    }
  }
  
  throw lastError || new Error("All AI providers failed");
}

async function makeAnthropicRequest(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: any[] = [{ role: "user", content: prompt }];
  
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    temperature: 0.3,
    system: systemPrompt,
    messages
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  
  throw new Error("Invalid response format from Anthropic");
}

/**
 * PHASE 1: Start Magic Flow - Idea Analysis
 * User provides app idea + target customers, AI analyzes and creates detailed summary
 */
export const startMagicFlow = async (req: Request, res: Response): Promise<void> => {
  const { prompt, targetCustomers, projectId } = req.body;
  
  if (!prompt) {
    res.status(400).json({ error: "App idea prompt is required" });
    return;
  }

  const jobId = generateJobId('concept');
  console.log(`[Magic Flow] Starting comprehensive analysis for job ${jobId}`);
  
  conceptJobs[jobId] = {
    status: "processing",
    phase: "analysis",
    progress: 10,
    startTime: new Date(),
    lastAccessed: new Date(),
    userPrompt: prompt,
    targetCustomers: targetCustomers || "General users"
  };

  // Start analysis in background
  analyzeAppIdea(jobId, prompt, targetCustomers, projectId);
  
  res.json({ 
    jobId, 
    status: "accepted", 
    phase: "analysis",
    message: "Starting comprehensive app idea analysis..."
  });
};

/**
 * Phase 1 Implementation: Comprehensive App Idea Analysis
 */
async function analyzeAppIdea(jobId: string, prompt: string, targetCustomers: string, projectId?: string) {
  try {
    console.log(`[Magic Flow] Phase 1: Analyzing app idea for job ${jobId}`);
    
    conceptJobs[jobId].progress = 20;
    conceptJobs[jobId].lastAccessed = new Date();

    const analysisPrompt = `You are an expert product analyst and software architect. Analyze the following app idea comprehensively and provide a detailed summary.

App Idea: ${prompt}
Target Customers/Users (ICP): ${targetCustomers}

Provide a comprehensive analysis in the following JSON format:
{
  "appSummary": {
    "name": "Suggested app name",
    "description": "Clear, detailed description of what the app does",
    "coreValue": "Main value proposition for users",
    "keyFeatures": ["feature1", "feature2", "feature3"],
    "userJourney": "How users will interact with the app step-by-step"
  },
  "targetAudience": {
    "primaryUsers": "Who will use this app primarily",
    "userPersonas": ["persona1", "persona2"],
    "painPoints": ["pain1", "pain2"],
    "useCases": ["usecase1", "usecase2"]
  },
  "technicalOverview": {
    "appType": "web app|mobile app|desktop app|api service",
    "architecture": "monolithic|microservices|serverless",
    "estimatedComplexity": "simple|medium|complex",
    "keyTechnologies": ["tech1", "tech2"],
    "dataRequirements": "What data the app will handle",
    "integrations": ["integration1", "integration2"]
  },
  "businessModel": {
    "revenueModel": "freemium|subscription|one-time|advertising",
    "marketSize": "estimated market opportunity",
    "competitiveAdvantage": "what makes this app unique",
    "mvpFeatures": ["core feature for MVP"]
  },
  "implementationPlan": {
    "estimatedTimeline": "development time estimate",
    "developmentPhases": ["phase1", "phase2"],
    "riskFactors": ["risk1", "risk2"],
    "successMetrics": ["metric1", "metric2"]
  },
  "recommendation": {
    "viability": "high|medium|low",
    "reasoning": "why this app idea is/isn't viable",
    "suggestedImprovements": ["improvement1", "improvement2"],
    "nextSteps": "what to do next"
  }
}

Be thorough, realistic, and provide actionable insights. Focus on creating a clear picture of what will be built.
Return ONLY the JSON response, no explanations.`;

    const analysisResponse = await makeAIRequest(analysisPrompt);
    const analysisResult = JSON.parse(analysisResponse);
    
    conceptJobs[jobId] = {
      ...conceptJobs[jobId],
      status: "completed",
      phase: "user_confirmation",
      progress: 100,
      analysisResult,
      endTime: new Date(),
      lastAccessed: new Date()
    };

    // Save to project if provided
    if (projectId) {
      try {
        const project = await getProjectById(projectId);
        if (project) {
          project.magicAnalysis = analysisResult;
          project.userPrompt = prompt;
          project.targetCustomers = targetCustomers;
          await saveProject(project);
        }
      } catch (error) {
        console.error(`[Magic Flow] Error saving analysis to project ${projectId}:`, error);
      }
    }
    
    console.log(`[Magic Flow] Phase 1 Complete: Analysis ready for user confirmation`);
    
  } catch (error: any) {
    console.error(`[Magic Flow] Phase 1 failed for job ${jobId}:`, error);
    conceptJobs[jobId] = {
      ...conceptJobs[jobId],
      status: "failed",
      phase: "analysis",
      progress: 100,
      error: error.message || "Analysis failed",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

/**
 * PHASE 2: User Confirmation/Rejection
 * User reviews the analysis and either confirms to proceed or rejects to restart
 */
export const handleUserConfirmation = async (req: Request, res: Response): Promise<void> => {
  const { jobId, confirmed, rejectionReason, updatedPrompt, updatedTargetCustomers } = req.body;
  
  if (!jobId || !conceptJobs[jobId]) {
    res.status(404).json({ error: "Concept job not found" });
    return;
  }

  const job = conceptJobs[jobId];
  memoryManager.touchJob(job);

  if (job.phase !== 'user_confirmation') {
    res.status(400).json({ error: "Job is not ready for user confirmation" });
    return;
  }

  if (confirmed) {
    // User confirmed - proceed to UML generation
    console.log(`[Magic Flow] User confirmed concept for job ${jobId}, starting UML generation`);
    
    const buildJobId = generateJobId('build');
    appCreationJobs[buildJobId] = {
      status: "processing",
      phase: "uml_generation", 
      progress: 10,
      startTime: new Date(),
      lastAccessed: new Date(),
      userPrompt: job.userPrompt,
      targetCustomers: job.targetCustomers,
      analysisResult: job.analysisResult,
      userConfirmed: true
    };

    // Start UML generation in background
    generateUMLDiagrams(buildJobId);
    
    res.json({
      conceptJobId: jobId,
      buildJobId,
      status: "confirmed",
      phase: "uml_generation",
      message: "Concept confirmed! Starting UML diagram generation..."
    });
    
  } else {
    // User rejected - restart with updated prompt if provided
    console.log(`[Magic Flow] User rejected concept for job ${jobId}`);
    
    job.userConfirmed = false;
    job.rejectionReason = rejectionReason || "User requested changes";
    job.lastAccessed = new Date();
    
    if (updatedPrompt) {
      // Start new analysis with updated prompt
      const newJobId = generateJobId('concept');
      console.log(`[Magic Flow] Starting new analysis with updated prompt for job ${newJobId}`);
      
      conceptJobs[newJobId] = {
        status: "processing",
        phase: "analysis",
        progress: 10,
        startTime: new Date(),
        lastAccessed: new Date(),
        userPrompt: updatedPrompt,
        targetCustomers: updatedTargetCustomers || job.targetCustomers
      };

      analyzeAppIdea(newJobId, updatedPrompt, updatedTargetCustomers || job.targetCustomers || "");
      
      res.json({
        originalJobId: jobId,
        newJobId,
        status: "restarted",
        phase: "analysis",
        message: "Starting new analysis with updated prompt..."
      });
    } else {
      res.json({
        jobId,
        status: "rejected",
        phase: "user_confirmation",
        message: "Concept rejected. Please provide an updated prompt to restart."
      });
    }
  }
};

/**
 * PHASE 3: UML Diagram Generation
 * Generate comprehensive UML diagrams (class, sequence, component, architecture)
 */
async function generateUMLDiagrams(jobId: string) {
  try {
    console.log(`[Magic Flow] Phase 3: Generating UML diagrams for job ${jobId}`);
    
    const job = appCreationJobs[jobId];
    job.progress = 20;
    job.lastAccessed = new Date();

    const { analysisResult, userPrompt, targetCustomers } = job;
    
    const umlPrompt = `Based on the comprehensive app analysis, generate detailed UML diagrams.

App Summary: ${JSON.stringify(analysisResult.appSummary, null, 2)}
Technical Overview: ${JSON.stringify(analysisResult.technicalOverview, null, 2)}
Original Prompt: ${userPrompt}
Target Customers: ${targetCustomers}

Generate comprehensive UML diagrams in PlantUML format:

{
  "componentDiagram": "PlantUML component diagram showing system architecture and component relationships",
  "classDiagram": "PlantUML class diagram with detailed classes, attributes, methods, and relationships", 
  "sequenceDiagram": "PlantUML sequence diagram showing key user interactions and system flows",
  "architectureDiagram": "PlantUML deployment diagram showing infrastructure components and deployment architecture"
}

Requirements:
1. Component diagram should show all major system components and their dependencies
2. Class diagram should include detailed business logic classes with methods and attributes
3. Sequence diagram should cover main user flows and system interactions
4. Architecture diagram should show deployment components (databases, servers, APIs, etc.)
5. Use proper PlantUML syntax with @startuml/@enduml blocks
6. Include meaningful component and class names based on the app functionality
7. Show clear relationships and data flow

Return ONLY the JSON response with PlantUML code.`;

    const umlResponse = await makeAIRequest(umlPrompt);
    const umlDiagrams = JSON.parse(umlResponse);
    
    job.progress = 50;
    job.umlDiagrams = umlDiagrams;
    job.phase = 'infra_generation';
    job.lastAccessed = new Date();
    
    console.log(`[Magic Flow] Phase 3 Complete: UML diagrams generated, starting infrastructure generation`);
    
    // Automatically proceed to infrastructure generation
    generateInfrastructureCode(jobId);
    
  } catch (error: any) {
    console.error(`[Magic Flow] Phase 3 failed for job ${jobId}:`, error);
    appCreationJobs[jobId] = {
      ...appCreationJobs[jobId],
      status: "failed",
      phase: "uml_generation",
      progress: 100,
      error: error.message || "UML generation failed",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

/**
 * PHASE 4: Infrastructure Code Generation
 * Generate Terraform infrastructure code based on architecture diagram
 */
async function generateInfrastructureCode(jobId: string) {
  try {
    console.log(`[Magic Flow] Phase 4: Generating infrastructure code for job ${jobId}`);
    
    const job = appCreationJobs[jobId];
    job.progress = 60;
    job.phase = 'infra_generation';
    job.lastAccessed = new Date();

    const { analysisResult, umlDiagrams, userPrompt } = job;
    
    const infraPrompt = `Generate production-ready Terraform infrastructure code based on the app analysis and architecture diagram.

App Analysis: ${JSON.stringify(analysisResult, null, 2)}
Architecture Diagram: ${umlDiagrams.architectureDiagram}
Component Diagram: ${umlDiagrams.componentDiagram}
Original Prompt: ${userPrompt}

Generate complete Terraform infrastructure code that includes:
1. All necessary AWS resources based on the architecture
2. Proper resource naming and organization
3. Security best practices and IAM roles
4. Scalability considerations
5. Cost optimization
6. Monitoring and logging setup

Return ONLY raw Terraform HCL code (no markdown, no code fences, just plain .tf content).`;

    const infraCode = await makeAIRequest(infraPrompt);
    
    job.progress = 70;
    job.infraCode = infraCode;
    job.phase = 'app_generation';
    job.lastAccessed = new Date();
    
    console.log(`[Magic Flow] Phase 4 Complete: Infrastructure code generated, starting app code generation`);
    
    // Automatically proceed to app code generation
    generateApplicationCode(jobId);
    
  } catch (error: any) {
    console.error(`[Magic Flow] Phase 4 failed for job ${jobId}:`, error);
    appCreationJobs[jobId] = {
      ...appCreationJobs[jobId],
      status: "failed",
      phase: "infra_generation",
      progress: 100,
      error: error.message || "Infrastructure generation failed",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

/**
 * PHASE 5: Application Code Generation
 * Generate application code using the agentic system based on component diagrams
 */
async function generateApplicationCode(jobId: string) {
  try {
    console.log(`[Magic Flow] Phase 5: Generating application code for job ${jobId}`);
    
    const job = appCreationJobs[jobId];
    job.progress = 80;
    job.phase = 'app_generation';
    job.lastAccessed = new Date();

    const { analysisResult, umlDiagrams, infraCode, userPrompt } = job;
    
    // Use the agentic code generation system from openAIController
    const { generateApplicationCode } = await import('./openAIController');
    
    // Create a mock request for the agentic system
    const mockReq = {
      body: {
        prompt: userPrompt,
        umlDiagrams,
        documentation: JSON.stringify(analysisResult),
        infraCode
      }
    } as any;
    
    const mockRes = {
      json: (data: any) => {
        job.appCode = data;
        job.progress = 90;
        job.phase = 'infra_provision';
        job.lastAccessed = new Date();
        
        console.log(`[Magic Flow] Phase 5 Complete: Application code generated, ready for infrastructure provisioning`);
        
        // Ready for manual provisioning trigger
        job.status = "ready_for_provision";
      },
      status: (code: number) => ({
        json: (data: any) => {
          throw new Error(`App generation failed: ${JSON.stringify(data)}`);
        }
      })
    } as any;
    
    await generateApplicationCode(mockReq, mockRes);
    
  } catch (error: any) {
    console.error(`[Magic Flow] Phase 5 failed for job ${jobId}:`, error);
    appCreationJobs[jobId] = {
      ...appCreationJobs[jobId],
      status: "failed",
      phase: "app_generation",
      progress: 100,
      error: error.message || "Application code generation failed",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

/**
 * PHASE 6: Infrastructure Provisioning (Manual Trigger)
 * Provision infrastructure using generated Terraform code
 */
export const provisionInfrastructure = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  if (!jobId || !appCreationJobs[jobId]) {
    res.status(404).json({ error: "Build job not found" });
    return;
  }

  const job = appCreationJobs[jobId];
  memoryManager.touchJob(job);

  if (job.status !== 'ready_for_provision') {
    res.status(400).json({ error: "Job is not ready for infrastructure provisioning" });
    return;
  }

  try {
    console.log(`[Magic Flow] Phase 6: Starting infrastructure provisioning for job ${jobId}`);
    
    job.status = "processing";
    job.phase = "infra_provision";
    job.progress = 95;
    job.lastAccessed = new Date();

    // Use the existing Terraform deployment system
    const { deployInfrastructure } = await import('./deployController');
    
    const mockReq = {
      body: {
        terraformCode: job.infraCode,
        projectId: `magic-${jobId}`
      }
    } as any;
    
    const mockRes = {
      json: (data: any) => {
        job.deploymentResult = data;
        job.progress = 100;
        job.phase = 'completed';
        job.status = 'completed';
        job.endTime = new Date();
        job.lastAccessed = new Date();
        
        console.log(`[Magic Flow] Phase 6 Complete: Infrastructure provisioned successfully`);
        res.json({
          jobId,
          status: "completed",
          phase: "completed",
          message: "Infrastructure provisioned successfully! App is ready for deployment.",
          deploymentResult: data
        });
      },
      status: (code: number) => ({
        json: (data: any) => {
          throw new Error(`Infrastructure provisioning failed: ${JSON.stringify(data)}`);
        }
      })
    } as any;
    
    await deployInfrastructure(mockReq, mockRes);
    
  } catch (error: any) {
    console.error(`[Magic Flow] Phase 6 failed for job ${jobId}:`, error);
    appCreationJobs[jobId] = {
      ...appCreationJobs[jobId],
      status: "failed",
      phase: "infra_provision",
      progress: 100,
      error: error.message || "Infrastructure provisioning failed",
      endTime: new Date(),
      lastAccessed: new Date()
    };
    
    res.status(500).json({
      jobId,
      status: "failed",
      phase: "infra_provision",
      error: error.message || "Infrastructure provisioning failed"
    });
  }
};

/**
 * Status Endpoints
 */
export const getConceptStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  if (!jobId || !conceptJobs[jobId]) {
    res.status(404).json({ error: "Concept job not found" });
    return;
  }
  
  memoryManager.touchJob(conceptJobs[jobId]);
  res.json(conceptJobs[jobId]);
};

export const getBuildStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  if (!jobId || !appCreationJobs[jobId]) {
    res.status(404).json({ error: "Build job not found" });
    return;
  }
  
  memoryManager.touchJob(appCreationJobs[jobId]);
  res.json(appCreationJobs[jobId]);
};

/**
 * Health Check Endpoints
 */
export const getMagicHealth = async (req: Request, res: Response): Promise<void> => {
  const conceptJobCount = Object.keys(conceptJobs).length;
  const buildJobCount = Object.keys(appCreationJobs).length;
  
  const conceptStatuses = Object.values(conceptJobs).reduce((acc: any, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  
  const buildStatuses = Object.values(appCreationJobs).reduce((acc: any, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    conceptJobs: {
      total: conceptJobCount,
      statuses: conceptStatuses
    },
    buildJobs: {
      total: buildJobCount,
      statuses: buildStatuses
    },
    recentConcepts: Object.entries(conceptJobs)
      .sort(([,a], [,b]) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
      .slice(0, 5)
      .map(([id, job]) => ({
        id,
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        startTime: job.startTime
      })),
    recentBuilds: Object.entries(appCreationJobs)
      .sort(([,a], [,b]) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
      .slice(0, 5)
      .map(([id, job]) => ({
        id,
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        startTime: job.startTime
      }))
  });
}; 