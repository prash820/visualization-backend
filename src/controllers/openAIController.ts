// src/controllers/openAIController.ts
import express from "express";
import { Request, Response,  } from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { group } from "console";
dotenv.config();
const router = express.Router();
export default router;

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
    architecture: `Generate a cloud architecture diagram based on the following user request:

          🔹 **User Query:** "<User's input>"  
          🔹 **Diagram Type:** "architecture"  
          
          ### **💡 Expected Output Format**
          1️⃣ **Group related services together** (e.g., AWS Services, AI Services).  
          2️⃣ **Ensure child services are housed inside parent groups** (e.g., EC2 inside VPC, Lambda inside Compute).  
          3️⃣ **Use intuitive positioning** (Avoid overlaps, maintain clear relationships).  
          4️⃣ **Define proper relationships** between services (e.g., API Gateway routes requests to Lambda, S3 stores output data).  
          
          ### **📌 JSON Format**
          json
          {
            "groups": [
              { "id": "aws-services", "label": "AWS Services" },
              { "id": "lambda-functions", "label": "Lambda Functions", "parentGroup": "aws-services" }
            ],
            "nodes": [
              { "id": "api-gateway", "label": "API Gateway", "group": "aws-services" },
              { "id": "lambda-1", "label": "Function A", "group": "lambda-functions" },
              { "id": "lambda-2", "label": "Function B", "group": "lambda-functions" },
              { "id": "s3", "label": "S3 Storage", "group": "aws-services" },
              { "id": "dynamodb", "label": "DynamoDB", "group": "aws-services" }
            ],
            "edges": [
              { "source": "api-gateway", "target": "lambda-1" },
              { "source": "lambda-1", "target": "s3" },
              { "source": "lambda-1", "target": "dynamodb" }
            ]
          }`,
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
    console.log("User Prompt:", prompt);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt[diagramType as DiagramType] },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
    });

    const fullResponse = response.choices[0]?.message?.content || "";
    console.log("AI Response ", fullResponse);
    switch (diagramType)  {
      case "architecture" : {
        const parsedData = parseArchitectureResponse(fullResponse);
        return res.json(parsedData);
      }
      default : {
        const parseData = parseGenericResponse(fullResponse);
        return res.json(parseData);
      }
    }

  } catch (error) {
    console.error("Error generating visualization:", error);
    return res.status(500).json({ error: "Failed to generate diagram." });
  }
};

export const generateIaC = async (req: Request, res: Response) => {
  const { nodes, edges, format } = req.body; // ✅ Ensure these values exist

  if (!nodes?.length || !edges?.length || !format) {
    console.error("❌ Missing parameters:", { nodes, edges, format });
    return res.status(400).json({ error: "Missing required parameters." });
  }

  console.log(`[AI] Generating ${format.toUpperCase()} code for architecture diagram`);

  const systemPrompt = `
    You are an expert in Infrastructure as Code (IaC).
    Given an architecture diagram with AWS services, generate valid ${format.toUpperCase()} code.
    
    ## Instructions:
    - Use official ${format.toUpperCase()} modules and syntax.
    - Ensure all services are correctly configured.
    - Handle dependencies (e.g., Lambda needs an IAM role).
    - Optimize for best practices.

    ## Example Input:
    Nodes: ${JSON.stringify(nodes, null, 2)}
    Edges: ${JSON.stringify(edges, null, 2)}

    ## Expected Output:
    - Valid ${format.toUpperCase()} code
    - No explanations, only the code output
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the IaC code for this architecture." },
      ],
      max_tokens: 1000,
    });

    // ✅ Safely Extract the AI Response
    const fullResponse = response.choices[0]?.message?.content || "";
    console.log("✅ AI IaC Response:", fullResponse);
    
    res.json({ code: fullResponse });
  } catch (error) {
    console.error("❌ Error generating IaC:", error);
    return res.status(500).json({ error: "Failed to generate IaC." });
  }
};

const parseArchitectureResponse = (response: string): ArchitectureResponse => {
  try {
    console.log("[AI RAW RESPONSE]:", response);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON format received from AI.");
    }

    const parsedData: ArchitectureResponse = JSON.parse(jsonMatch[0]);

    if (!parsedData.nodes || !parsedData.edges || !parsedData.groups) {
      throw new Error("Missing required keys (nodes, edges, groups) in AI response.");
    }

    // ✅ Ensure every node has a valid group
    parsedData.nodes.forEach((node: DiagramNode) => {
      if (!node.group) {
        throw new Error(`Node "${node.label}" is missing a group!`);
      }
    });

    return parsedData;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Invalid architecture response format");
  }
};

const parseGenericResponse = (response: string) => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON format");

    const diagramJson = JSON.parse(jsonMatch[0]);
    
    if (!diagramJson.nodes || !diagramJson.edges) {
      throw new Error("Missing nodes or edges in response");
    }

    return diagramJson;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Invalid generic diagram response format");
  }
};
