// src/controllers/openAIController.ts
import express from "express";
import { Request, Response,  } from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
export default router;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const generateVisualization = async (req: Request, res: Response) => {
  const { prompt, diagramType } = req.body;
  if (!prompt || !diagramType) {
    return res.status(400).json({ error: "Missing required parameters." });
  }
  type DiagramType = "flowchart" | "architecture" | "sequence" | "uml";


  console.log(`[AI] Generating diagram for prompt: ${prompt} with diagramType: ${diagramType}`);

  const systemPrompt : Record<DiagramType, string> = {
    flowchart: `
                  You are an AI assistant specialized in generating flowcharts based on user prompts.
              Return only valid JSON with two arrays: "nodes" and "edges".
              Each node should have an "id", "label", "role", and a default position.
              Each edge should connect nodes using "sourceLabel", "targetLabel" and edge label that says what is happening between steps.
              Role means the type of node, like start/end, process, decision, input output, etc
              Do not include any extra text.          
      `,
    architecture: `You are an AI assistant specialized in generating architecture diagrams based on user prompts with over 10 years of experience.

      Return only valid JSON in the following format:

      json
      Copy
      Edit
      {
        "nodes": [
          {
            "provider": "aws",
            "service": "service_name",          // Service name (e.g., VPC, EC2, S3)
            "label": "Readable Label",          // Human-readable label (e.g., Virtual Private Cloud)
            "group": "Main Group",              // High-level cluster (e.g., AWS, Azure)
            "subgroup": "Sub Group",            // Sub-cluster under the main group (e.g., Networking, Compute)
            "parent": "Parent Node Label",      // Optional: If this node is contained within another (e.g., VPC contains EC2)
            "position": { "x": 0, "y": 0 }      // Optional: Node position
          }
        ],
        "edges": [
          {
            "sourceLabel": "Readable Label",    // Matches the label field in nodes
            "targetLabel": "Readable Label",    // Matches the label field in nodes
            "label": "Optional Edge Label"      // Optional: Label for the edge
          }
        ]
      }
      Rules:
      Ensure "provider" is always "aws" and that "service" is one of AWS's official products.
      Use "group" for high-level clusters (e.g., AWS) and "subgroup" for service categories (e.g., Networking, Compute).
      Utilize the "parent" field to represent hierarchical relationships (e.g., VPC → Subnet → EC2).
      Maintain connections across clusters, sub-clusters, and parent-child nodes using accurate edges.
      Do not include any extra text, commentary, or explanations — only the JSON output.  `,
    sequence: `
          You are an AI assistant specialized in generating sequence diagrams based on user prompts.
        Return only valid JSON with two arrays: "nodes" and "edges".
        Nodes represent actors or steps, and edges represent the flow of interactions.
        Format example:
        {
          "nodes": [{ "label": "Actor or Step" }],
          "edges": [{ "sourceLabel": "Label", "targetLabel": "Label", "label": "Message" }]
        }
        Do not include any extra text.
      `,
    uml: `
                You are an AI assistant specialized in generating UML class diagrams based on user prompts.
                Return only valid JSON with two arrays: "nodes" and "edges".
                Each node represents a class (with a "label"), and edges represent relationships between classes.
                Format example:
                {
                  "nodes": [{ "label": "ClassName" }],
                  "edges": [{ "sourceLabel": "ClassName", "targetLabel": "ClassName", "label": "Relationship" }]
                }
                Do not include any extra text.
                      `
  };
  // Choose a system prompt based on diagramType
  try {
    console.log("user prompt ", prompt);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt[diagramType as DiagramType] },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
    });

    const fullResponse = response.choices[0]?.message?.content || "";
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(400).json({ error: "Invalid JSON response from AI" });
    }

    console.log("AI Response:", jsonMatch[0]);
    const diagramJson = JSON.parse(jsonMatch[0]);
    return res.json({ nodes: diagramJson.nodes, edges: diagramJson.edges });
  } catch (error) {
    console.error("Error generating visualization:", error);
    return res.status(500).json({ error: "Failed to generate diagram." });
  }
};
