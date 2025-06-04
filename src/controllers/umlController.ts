import { Request, Response } from 'express';
import { getProjectById, saveProject } from '../utils/projectFileStore';
import { generateUmlFromPrompt, UMLDiagrams, parseUMLResponse } from '../utils/umlGenerator';
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const generateUmlDiagrams = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    // Generate and parse diagrams
    const aiResponse = await generateUmlFromPrompt(prompt);
    
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    project.umlDiagrams = aiResponse;
    await saveProject(project);
    res.json({
      id: project._id,
      projectId: project._id,
      diagrams: aiResponse,
      prompt: prompt,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating UML diagrams:', error);
    res.status(500).json({ error: 'Failed to generate UML diagrams' });
  }
};

// All other CRUD operations for UML diagrams should be handled by updating the project object using the file store. 