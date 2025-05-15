import { Request, Response } from 'express';
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const openai = new OpenAIApi(configuration);

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
    const completion = await openai.createChatCompletion({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant specialized in generating cloud architecture diagrams.
          Return only valid JSON with two arrays: "nodes" and "edges".
          Each node should have:
          - id: unique identifier
          - type: node type (e.g., "default", "input", "output")
          - position: { x: number, y: number }
          - data: { label: string, [key: string]: any }
          
          Each edge should have:
          - id: unique identifier
          - source: source node id
          - target: target node id
          - label: optional description
          
          Example format:
          {
            "nodes": [
              {
                "id": "node1",
                "type": "default",
                "position": { "x": 100, "y": 100 },
                "data": { "label": "API Gateway" }
              }
            ],
            "edges": [
              {
                "id": "edge1",
                "source": "node1",
                "target": "node2",
                "label": "invokes"
              }
            ]
          }
          
          Do not include any extra text.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const response = completion.data.choices[0].message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log("[Architecture Controller] Received OpenAI response:", response);

    try {
      const parsedData = JSON.parse(response);
      console.log("[Architecture Controller] Parsed data:", {
        nodes: parsedData.nodes?.length,
        edges: parsedData.edges?.length,
      });
      
      res.json(parsedData);
    } catch (parseError) {
      console.error("[Architecture Controller] Error parsing response:", parseError);
      throw new Error("Invalid JSON response from OpenAI");
    }
  } catch (error) {
    console.error('[Architecture Controller] Error generating diagram:', error);
    res.status(500).json({ error: 'Failed to generate architecture diagram' });
  }
}; 