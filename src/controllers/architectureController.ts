import { Request, Response } from 'express';
import { anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import dotenv from "dotenv";
dotenv.config();

interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string; [key: string]: any };
}

interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  [key: string]: any;
}

export const generateArchitectureDiagram = async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body;
  console.log("[Architecture Controller] Generating diagram for prompt:", prompt);

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    });
    const content = response.content[0];
    const resultText = content.type === 'text' ? content.text : '';

    console.log("[Architecture Controller] Received Anthropic response:", resultText);

    try {
      const parsedData = JSON.parse(resultText);
      console.log("[Architecture Controller] Parsed data:", {
        nodes: parsedData.nodes?.length,
        edges: parsedData.edges?.length,
      });
      
      res.json(parsedData);
    } catch (parseError) {
      console.error("[Architecture Controller] Error parsing response:", parseError);
      throw new Error("Invalid JSON response from Anthropic");
    }
  } catch (error) {
    console.error('[Architecture Controller] Error generating diagram:', error);
    res.status(500).json({ error: 'Failed to generate architecture diagram' });
  }
}; 