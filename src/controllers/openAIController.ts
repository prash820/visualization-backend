// src/controllers/openAIController.ts
import express from "express";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
dotenv.config();

interface DiagramNode {
  id: string;
  label: string;
  group?: string;
  subgroup?: string;
}

interface DiagramEdge {
  source: string;
  target: string;
  label?: string;
}

interface DiagramGroup {
  id: string;
  label: string;
  parentGroup?: string;
}

interface ArchitectureResponse {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}

// In-memory job store for diagram jobs - now with memory management
interface DiagramJob extends MemoryOptimizedJob {
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
}

const diagramJobs: Record<string, DiagramJob> = {};

// Set up memory management for job stores
memoryManager.setupJobStoreCleanup(diagramJobs, "diagramJobs", 20 * 60 * 1000, 50); // 20 min, max 50 jobs

export const generateVisualization = async (req: Request, res: Response) => {
  const { prompt, diagramType } = req.body;
  if (!prompt || !diagramType) {
    return res.status(400).json({ error: "Missing required parameters." });
  }
  const jobId = generateJobId();
  diagramJobs[jobId] = { 
    status: "pending", 
    progress: 0,
    startTime: new Date(),
    lastAccessed: new Date()
  };
  processDiagramJob(jobId, prompt, diagramType);
  res.json({ jobId, status: "accepted" });
};

async function processDiagramJob(jobId: string, prompt: string, diagramType: string) {
  try {
    diagramJobs[jobId] = { 
      ...diagramJobs[jobId],
      status: "processing", 
      progress: 10,
      lastAccessed: new Date()
    };
    type DiagramType = "flowchart" | "architecture" | "sequence" | "uml";
    const systemPrompt: Record<DiagramType, string> = {
      flowchart: `You are an AI assistant specialized in generating flowcharts based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nEach node should have an "id", "label", "role", and a default position.\nEach edge should connect nodes using "sourceLabel", "targetLabel" and edge label that says what is happening between steps.\nRole means the type of node, like start/end, process, decision, input output, etc\nDo not include any extra text.`,
      architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nEach node represents a cloud service or component (with a "label"), and edges represent connections between services.\nFormat example: { "nodes": [{ "label": "Service Name" }], "edges": [{ "sourceLabel": "Service", "targetLabel": "Service", "label": "Connection" }] }\nDo not include any extra text.`,
      sequence: `You are an AI assistant specialized in generating sequence diagrams based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nNodes represent actors or steps, and edges represent the flow of interactions.\nFormat example: { "nodes": [{ "label": "Actor or Step" }], "edges": [{ "sourceLabel": "Label", "targetLabel": "Label", "label": "Message" }] }\nDo not include any extra text.`,
      uml: `You are an AI assistant specialized in generating UML class diagrams based on user prompts.\nReturn only valid JSON with two arrays: "nodes" and "edges".\nEach node represents a class (with a "label"), and edges represent relationships between classes.\nFormat example: { "nodes": [{ "label": "ClassName" }], "edges": [{ "sourceLabel": "ClassName", "targetLabel": "ClassName", "label": "Relationship" }] }\nDo not include any extra text.`
    };
    diagramJobs[jobId].progress = 20;
    
    // Use OpenAI GPT-4o as primary, Anthropic Claude as fallback
    let response;
    try {
      // Try OpenAI first
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 4096,
        temperature: 0.5,
      messages: [
          { role: "user", content: `${systemPrompt[diagramType as DiagramType]}\n\nUser prompt: ${prompt}` }
        ]
      });
      console.log(`[Diagram] OpenAI request successful for jobId=${jobId}`);
    } catch (openaiError) {
      console.log(`[Diagram] OpenAI failed for jobId=${jobId}, trying Anthropic:`, openaiError);
      // Fallback to Anthropic
      response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0.5,
        messages: [
          { role: "user", content: `${systemPrompt[diagramType as DiagramType]}\n\nUser prompt: ${prompt}` }
        ]
    });
      console.log(`[Diagram] Anthropic fallback successful for jobId=${jobId}`);
    }
    
    diagramJobs[jobId].progress = 60;
    
    // Handle response based on provider
    let fullResponse: string;
    if ('choices' in response) {
      // OpenAI response
      fullResponse = response.choices[0]?.message?.content || "";
    } else {
      // Anthropic response
      fullResponse = response.content[0]?.type === 'text' ? response.content[0].text : "";
    }
    
    let parsedData;
    if (diagramType === "architecture") {
      parsedData = parseArchitectureResponse(fullResponse);
    } else {
      parsedData = parseGenericResponse(fullResponse);
    }
    diagramJobs[jobId] = { 
      ...diagramJobs[jobId],
      status: "completed", 
      progress: 100, 
      result: parsedData,
      endTime: new Date(),
      lastAccessed: new Date()
    };
  } catch (error: any) {
    diagramJobs[jobId] = { 
      ...diagramJobs[jobId],
      status: "failed", 
      progress: 100, 
      error: error.message || "Unknown error",
      endTime: new Date(),
      lastAccessed: new Date()
    };
  }
}

export const getDiagramJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  if (!jobId || !diagramJobs[jobId]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  
  // Update access time for memory management
  memoryManager.touchJob(diagramJobs[jobId]);
  
  res.json(diagramJobs[jobId]);
};

function generateJobId() {
  return `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

const parseArchitectureResponse = (response: string): ArchitectureResponse => {
  try {
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanedResponse);
    return {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
      groups: parsed.groups || []
    };
  } catch (error) {
    console.error('Error parsing architecture response:', error);
    return { nodes: [], edges: [], groups: [] };
  }
};

const parseGenericResponse = (response: string) => {
  try {
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error parsing generic response:', error);
    return { nodes: [], edges: [] };
  }
}; 