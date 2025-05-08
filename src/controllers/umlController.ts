import { Request, Response } from 'express';
import { UmlDiagram } from '../models/umlDiagram';
import { generateUmlFromPrompt } from '../utils/umlGenerator';
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const generateUmlDiagrams = async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant specialized in generating UML diagrams in PlantUML format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    res.json({ diagram: response });
  } catch (error) {
    console.error('Error generating UML diagram:', error);
    res.status(500).json({ error: 'Failed to generate UML diagram' });
  }
};

export const saveUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { projectId, diagramType, diagramData } = req.body;
    
    if (!projectId || !diagramType || !diagramData) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const diagram = await UmlDiagram.create({
      projectId,
      diagramType,
      diagramData,
    });

    res.json(diagram);
  } catch (error) {
    console.error('Error saving UML diagram:', error);
    res.status(500).json({ error: 'Failed to save UML diagram' });
  }
};

export const getUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diagram = await UmlDiagram.findById(id);
    
    if (!diagram) {
      res.status(404).json({ error: 'UML diagram not found' });
      return;
    }

    res.json(diagram);
  } catch (error) {
    console.error('Error getting UML diagram:', error);
    res.status(500).json({ error: 'Failed to get UML diagram' });
  }
};

export const updateUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { diagramData } = req.body;
    
    if (!diagramData) {
      res.status(400).json({ error: 'Diagram data is required' });
      return;
    }

    const diagram = await UmlDiagram.findByIdAndUpdate(
      id,
      { diagramData },
      { new: true }
    );

    if (!diagram) {
      res.status(404).json({ error: 'UML diagram not found' });
      return;
    }

    res.json(diagram);
  } catch (error) {
    console.error('Error updating UML diagram:', error);
    res.status(500).json({ error: 'Failed to update UML diagram' });
  }
};

export const deleteUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diagram = await UmlDiagram.findByIdAndDelete(id);
    
    if (!diagram) {
      res.status(404).json({ error: 'UML diagram not found' });
      return;
    }

    res.json({ message: 'UML diagram deleted successfully' });
  } catch (error) {
    console.error('Error deleting UML diagram:', error);
    res.status(500).json({ error: 'Failed to delete UML diagram' });
  }
}; 