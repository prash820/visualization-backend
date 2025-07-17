// src/controllers/iacController.ts
import express from "express";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
dotenv.config();

interface IaCJob extends MemoryOptimizedJob {
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
}

const iacJobs: Record<string, IaCJob> = {};

// Set up memory management for job stores
memoryManager.setupJobStoreCleanup(iacJobs, "iacJobs", 30 * 60 * 1000, 50); // 30 min, max 50 jobs

function generateJobId() {
  return `iac-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export const generateIaC = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId, umlDiagrams } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  const jobId = generateJobId();
  iacJobs[jobId] = { 
    status: "pending", 
    progress: 0,
    startTime: new Date(),
    lastAccessed: new Date()
  };
  // Start background job
  processIaCJob(jobId, prompt, projectId, umlDiagrams);
  res.json({ jobId, status: "accepted" });
};

async function processIaCJob(jobId: string, prompt: string, projectId: string, umlDiagrams: any) {
  try {
    iacJobs[jobId] = { 
      ...iacJobs[jobId],
      status: "processing", 
      progress: 10,
      lastAccessed: new Date()
    };

    const systemPrompt = `You are an AI assistant specialized in generating Infrastructure as Code (IaC) using Terraform for AWS resources based on user prompts and UML diagrams.

Your task is to:
1. Analyze the user's prompt and UML diagrams to understand the application architecture
2. Generate comprehensive Terraform code for AWS infrastructure
3. Include all necessary AWS resources (VPC, EC2, RDS, S3, Lambda, etc.)
4. Follow AWS best practices for security, scalability, and cost optimization
5. Include proper variable definitions, outputs, and documentation

Return only valid Terraform code with proper syntax. Do not include any explanations or markdown formatting.

UML Diagrams Context:
${JSON.stringify(umlDiagrams, null, 2)}

User Requirements:
${prompt}`;

    iacJobs[jobId].progress = 30;

    // Use OpenAI GPT-4o as primary, Anthropic Claude as fallback
    let response;
    try {
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: "user", content: systemPrompt }
        ]
      });
      console.log(`[IaC] OpenAI request successful for jobId=${jobId}`);
    } catch (openaiError) {
      console.log(`[IaC] OpenAI failed for jobId=${jobId}, trying Anthropic:`, openaiError);
      response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: "user", content: systemPrompt }
        ]
      });
      console.log(`[IaC] Anthropic fallback successful for jobId=${jobId}`);
    }

    iacJobs[jobId].progress = 70;

    // Handle response based on provider
    let terraformCode: string;
    if ('choices' in response) {
      // OpenAI response
      terraformCode = response.choices[0]?.message?.content || "";
    } else {
      // Anthropic response
      terraformCode = response.content[0]?.type === 'text' ? response.content[0].text : "";
    }

    // Clean up the response to ensure it's valid Terraform code
    terraformCode = terraformCode.replace(/```terraform\n?/g, '').replace(/```\n?/g, '').trim();

    iacJobs[jobId] = { 
      ...iacJobs[jobId],
      status: "completed", 
      progress: 100, 
      result: { terraformCode },
      endTime: new Date(),
      lastAccessed: new Date()
    };
  } catch (error: any) {
    iacJobs[jobId] = { 
      ...iacJobs[jobId],
      status: "failed", 
      progress: 100, 
      error: error.message || "Unknown error",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

export const getIaCJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  if (!jobId || !iacJobs[jobId]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  
  // Update access time for memory management
  memoryManager.touchJob(iacJobs[jobId]);
  
  res.json(iacJobs[jobId]);
}; 