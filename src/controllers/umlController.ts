import { Request, Response } from 'express';
import { getProjectById, saveProject } from '../utils/projectFileStore';
import { generateUmlFromPrompt, UMLDiagrams, parseUMLResponse } from '../utils/umlGenerator';
import OpenAI from "openai";
import dotenv from "dotenv";
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_SECRET_KEY,
});

// In-memory job store for UML jobs - now with memory management
interface UMLJob extends MemoryOptimizedJob {
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
  retryCount?: number;
}

const umlJobs: Record<string, UMLJob> = {};

// Set up memory management for job stores - increased retention time
memoryManager.setupJobStoreCleanup(umlJobs, "umlJobs", 60 * 60 * 1000, 100); // 60 min, max 100 jobs

function generateJobId() {
  return `uml-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// Rate limiting and retry logic
async function makeAIRequestWithRetry(prompt: string, maxRetries: number = 3): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[UML] AI request attempt ${attempt}/${maxRetries}`);
      
      // Try OpenAI first
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await generateUmlFromPrompt(prompt);
          console.log(`[UML] OpenAI request successful on attempt ${attempt}`);
          return response;
        } catch (error: any) {
          console.log(`[UML] OpenAI failed on attempt ${attempt}:`, error.message);
          
          // If it's a rate limit error, try Anthropic
          if (error.message?.includes('429') || error.message?.includes('quota')) {
            console.log(`[UML] Rate limit detected, trying Anthropic...`);
            return await makeAnthropicRequest(prompt);
          }
          
          lastError = error;
        }
      }
      
      // Fallback to Anthropic
      if (process.env.ANTHROPIC_SECRET_KEY) {
        try {
          const response = await makeAnthropicRequest(prompt);
          console.log(`[UML] Anthropic request successful on attempt ${attempt}`);
          return response;
        } catch (error: any) {
          console.log(`[UML] Anthropic failed on attempt ${attempt}:`, error.message);
          lastError = error;
        }
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[UML] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error: any) {
      console.error(`[UML] Unexpected error on attempt ${attempt}:`, error);
      lastError = error;
    }
  }
  
  throw lastError || new Error("All AI providers failed after retries");
}

async function makeAnthropicRequest(prompt: string): Promise<any> {
  const systemPrompt = `You are an expert software architect and UML diagram generator. Generate comprehensive UML diagrams based on the user's requirements.

Return a JSON object with the following UML diagram types:
{
  "componentDiagram": "PlantUML component diagram code",
  "classDiagram": "PlantUML class diagram code", 
  "sequenceDiagram": "PlantUML sequence diagram code",
  "useCaseDiagram": "PlantUML use case diagram code"
}

Generate PlantUML code for each diagram type. Use proper PlantUML syntax:
- Start with @startuml and end with @enduml
- Use appropriate PlantUML elements and relationships
- Include meaningful names and relationships
- Make diagrams comprehensive and professional

Focus on creating diagrams that clearly show:
1. Component relationships and dependencies
2. Class structure with methods and attributes
3. Sequence of operations and interactions
4. Use cases and actors

Return ONLY the JSON object, no explanations.`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }]
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  
  throw new Error("Invalid response format from Anthropic");
}

export const generateUmlDiagrams = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  
  const jobId = generateJobId();
  console.log(`[UML] Starting job ${jobId} for prompt: ${prompt.substring(0, 100)}...`);
  
  umlJobs[jobId] = { 
    status: "pending", 
    progress: 0,
    startTime: new Date(),
    lastAccessed: new Date(),
    retryCount: 0
  };
  
  // Start processing in background
  processUmlJob(jobId, prompt, projectId);
  
  res.json({ jobId, status: "accepted" });
};

async function processUmlJob(jobId: string, prompt: string, projectId: string) {
  try {
    console.log(`[UML] Processing job ${jobId}`);
    
    umlJobs[jobId] = { 
      ...umlJobs[jobId],
      status: "processing", 
      progress: 10,
      lastAccessed: new Date()
    };
    
    // Make AI request with retry logic
    const aiResponse = await makeAIRequestWithRetry(prompt);
    
    umlJobs[jobId].progress = 60;
    umlJobs[jobId].lastAccessed = new Date();
    
    console.log(`[UML] AI response received for job ${jobId}`);
    
    // Save to project if projectId is provided
    if (projectId) {
      try {
        const project = await getProjectById(projectId);
        if (project) {
          project.umlDiagrams = aiResponse;
          await saveProject(project);
          console.log(`[UML] Saved to project ${projectId}`);
        }
      } catch (error) {
        console.error(`[UML] Error saving to project ${projectId}:`, error);
        // Don't fail the job if project save fails
      }
    }
    
    umlJobs[jobId] = { 
      ...umlJobs[jobId],
      status: "completed", 
      progress: 100, 
      result: aiResponse,
      endTime: new Date(),
      lastAccessed: new Date()
    };
    
    console.log(`[UML] Job ${jobId} completed successfully`);
    
  } catch (error: any) {
    console.error(`[UML] Job ${jobId} failed:`, error);
    
    umlJobs[jobId] = { 
      ...umlJobs[jobId],
      status: "failed", 
      progress: 100, 
      error: error.message || "Unknown error",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

export const getUmlJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  
  console.log(`[UML] Checking status for job ${jobId}`);
  console.log(`[UML] Available jobs:`, Object.keys(umlJobs));
  
  if (!jobId || !umlJobs[jobId]) {
    console.log(`[UML] Job ${jobId} not found`);
    res.status(404).json({ error: "Job not found" });
    return;
  }
  
  // Update access time for memory management
  memoryManager.touchJob(umlJobs[jobId]);
  
  console.log(`[UML] Job ${jobId} status: ${umlJobs[jobId].status}`);
  res.json(umlJobs[jobId]);
};

// Health check for UML jobs
export const getUmlJobsHealth = async (req: Request, res: Response): Promise<void> => {
  const jobCount = Object.keys(umlJobs).length;
  const jobStatuses = Object.values(umlJobs).reduce((acc: any, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    totalJobs: jobCount,
    jobStatuses,
    recentJobs: Object.entries(umlJobs)
      .sort(([,a], [,b]) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
      .slice(0, 10)
      .map(([id, job]) => ({
        id,
        status: job.status,
        progress: job.progress,
        startTime: job.startTime,
        endTime: job.endTime
      }))
  });
};

// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 