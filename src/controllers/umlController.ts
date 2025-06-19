import { Request, Response } from 'express';
import { getProjectById, saveProject } from '../utils/projectFileStore';
import { generateUmlFromPrompt, UMLDiagrams, parseUMLResponse } from '../utils/umlGenerator';
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// In-memory job store for UML jobs
const umlJobs: Record<string, { status: string; progress: number; result?: any; error?: string }> = {};

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
  umlJobs[jobId] = { status: "pending", progress: 0 };
  processUmlJob(jobId, prompt, projectId);
  res.json({ jobId, status: "accepted" });
};

async function processUmlJob(jobId: string, prompt: string, projectId: string) {
  try {
    umlJobs[jobId] = { status: "processing", progress: 10 };
    const aiResponse = await generateUmlFromPrompt(prompt);
    umlJobs[jobId].progress = 60;
    // Save to project if projectId is provided
    if (projectId) {
      const project = await getProjectById(projectId);
      if (project) {
        project.umlDiagrams = aiResponse;
        await saveProject(project);
      }
    }
    umlJobs[jobId] = { status: "completed", progress: 100, result: aiResponse };
  } catch (error: any) {
    umlJobs[jobId] = { status: "failed", progress: 100, error: error.message || "Unknown error" };
  }
}

export const getUmlJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  if (!jobId || !umlJobs[jobId]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(umlJobs[jobId]);
};

// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 