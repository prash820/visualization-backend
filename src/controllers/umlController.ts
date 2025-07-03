import { Request, Response } from 'express';
import { getProjectById, saveProject } from '../utils/projectFileStore';
import { generateUmlFromPrompt, UMLDiagrams, parseUMLResponse } from '../utils/umlGenerator';
import OpenAI from "openai";
import dotenv from "dotenv";
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
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
}

const umlJobs: Record<string, UMLJob> = {};

// Set up memory management for job stores
memoryManager.setupJobStoreCleanup(umlJobs, "umlJobs", 25 * 60 * 1000, 40); // 25 min, max 40 jobs

function generateJobId() {
  return `uml-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export const generateUmlDiagrams = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  const jobId = generateJobId();
  umlJobs[jobId] = { 
    status: "pending", 
    progress: 0,
    startTime: new Date(),
    lastAccessed: new Date()
  };
  processUmlJob(jobId, prompt, projectId);
  res.json({ jobId, status: "accepted" });
};

async function processUmlJob(jobId: string, prompt: string, projectId: string) {
  try {
    umlJobs[jobId] = { 
      ...umlJobs[jobId],
      status: "processing", 
      progress: 10,
      lastAccessed: new Date()
    };
    const aiResponse = await generateUmlFromPrompt(prompt);
    umlJobs[jobId].progress = 60;
    umlJobs[jobId].lastAccessed = new Date();
    
    // Save to project if projectId is provided
    if (projectId) {
      const project = await getProjectById(projectId);
      if (project) {
        project.umlDiagrams = aiResponse;
        await saveProject(project);
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
  } catch (error: any) {
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
  if (!jobId || !umlJobs[jobId]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  
  // Update access time for memory management
  memoryManager.touchJob(umlJobs[jobId]);
  
  res.json(umlJobs[jobId]);
};

// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 