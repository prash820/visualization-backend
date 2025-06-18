// src/controllers/openAIController.ts
import express from "express";
import { Request, Response,  } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import Anthropic from '@anthropic-ai/sdk';
import path from "path";
import fs from "fs";
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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_SECRET_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});

export const generateVisualization = async (req: Request, res: Response) => {
  const { prompt, diagramType } = req.body;
  console.log("🔹 Prompt:", req.body);
  if (!prompt || !diagramType) {
    console.log("🔹 Missing required parameters.");
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
    architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.

### **🔹 User Query:** "<User's Input>"
### **🔹 Diagram Type:** "architecture"

## **🌟 Rules for Generating JSON Output**
1️⃣ **Group services under their respective cloud providers** (AWS, Azure, OCI).  
2️⃣ **If a cloud provider has a VPC, the services inside that VPC should be grouped inside it.**  
3️⃣ **Keep cloud providers as separate top-level groups**, even if services communicate between providers.  
4️⃣ **Ensure correct edge connections** between services, even across different providers.  
5️⃣ **Use proper hierarchical nesting** to reflect real-world cloud architectures.  

### **📌 Expected JSON Format** No Other text should be part of the response or no additional follow up questions

{
  "groups": [
    { "id": "aws-services", "label": "AWS Services" },
    { "id": "aws-vpc-1", "label": "AWS VPC 1", "parentGroup": "aws-services" },
    { "id": "azure-services", "label": "Azure Services" },
    { "id": "oci-services", "label": "OCI Services" }
  ],
  "nodes": [
    { "id": "api-gateway", "label": "API Gateway", "service": "api-gateway", "group": "aws-services" },
    { "id": "lambda-1", "label": "Lambda Function", "service": "lambda", "group": "aws-vpc-1" },
    { "id": "s3", "label": "S3 Storage", "service": "s3", "group": "aws-services" },
    { "id": "rds", "label": "RDS Database", "service": "rds", "group": "aws-services" },
    { "id": "azure-app-service", "label": "Azure Web App", "service": "app-service", "group": "azure-services" },
    { "id": "oci-object-storage", "label": "OCI Object Storage", "service": "object-storage", "group": "oci-services" }
  ],
  "edges": [
  { "source": "api-gateway", "target": "lambda-1", "label": "Invokes" },
  { "source": "lambda-1", "target": "s3", "label": "Stores Data" },
  { "source": "lambda-1", "target": "rds", "label": "Queries" },
  { "source": "azure-app-service", "target": "oci-object-storage", "label": "Writes To" }
]

}
`,
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
      model: "gpt-4-0125-preview",
      messages: [
        { role: "system", content: systemPrompt[diagramType as DiagramType] },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });


    const fullResponse = response.choices[0]?.message?.content || "";
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

export const generateIaC = async (req: Request, res: Response): Promise<void> => {
  console.log("[IaC Backend] Received request to generate infrastructure code");
  const { prompt, projectId, umlDiagrams } = req.body;
  console.log("[IaC Backend] Request body:", { prompt, projectId, umlDiagrams });

  if (!prompt) {
    console.log("[IaC Backend] Missing prompt in request");
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    console.log("[IaC Backend] Constructing system prompt");
    // Construct a strict system prompt that requires only a JSON object in the response
    const systemPrompt = `You are an AI assistant that generates Infrastructure as Code (IaC) using Terraform.

Your task is to generate production-ready Terraform code for the user's project, based on their prompt and UML diagrams.

**IMPORTANT INSTRUCTIONS:**
1. Analyze the provided UML diagrams to understand the system architecture
2. Generate Terraform code that exactly matches the components and relationships shown in the diagrams
3. Include all necessary AWS services shown in the diagrams (e.g., API Gateway, Lambda, S3, DynamoDB, Cognito)
4. Set up proper IAM roles and permissions for service interactions
5. Configure security groups and network access as needed
6. Return ONLY a raw JSON object, with no markdown formatting, code blocks, or extra text
7. Do not wrap the response in \`\`\`json or any other markdown formatting

The JSON object must have two fields:
- "code": a string containing the complete Terraform code (all files concatenated, with clear file boundaries as comments)
- "documentation": a string containing Markdown documentation for the infrastructure

**Example output format (return exactly this format, no markdown):**
{
  "code": "// main.tf\n...\n// variables.tf\n...\n",
  "documentation": "# Infrastructure Documentation\n..."
}`;

    console.log("[IaC Backend] Sending request to OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Generate infrastructure code for the following system:
          
Prompt: ${prompt}

UML Diagrams:
${Object.entries(umlDiagrams).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}`
        },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });

    console.log("[IaC Backend] Received response from OpenAI");
    const fullResponse = response.choices[0]?.message?.content || "";
    console.log("[IaC Backend] Full response:", fullResponse);

    try {
      // Clean the response by removing any markdown formatting
      const cleanedResponse = fullResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsedResponse = JSON.parse(cleanedResponse);
      console.log("[IaC Backend] Parsed response:", parsedResponse);

      // Validate the response structure
      if (!parsedResponse.code || !parsedResponse.documentation) {
        throw new Error("Response missing required fields: code and documentation");
      }

      // Save the generated code to a file if projectId is provided
      if (projectId) {
        const projectDir = path.join(process.cwd(), "workspace", projectId);
        if (!fs.existsSync(projectDir)) {
          fs.mkdirSync(projectDir, { recursive: true });
        }

        // Save the Terraform code
        fs.writeFileSync(path.join(projectDir, "terraform.tf"), parsedResponse.code);
        // Save the documentation
        fs.writeFileSync(path.join(projectDir, "README.md"), parsedResponse.documentation);

        // Save infraCode to the project
        try {
          const { getProjectById, saveProject } = await import("../utils/projectFileStore");
          const project = await getProjectById(projectId);
          if (project) {
            project.infraCode = parsedResponse.code;
            await saveProject(project);
          }
        } catch (err) {
          console.error("[IaC Backend] Error saving infraCode to project:", err);
        }
      }

      res.json(parsedResponse);
    } catch (error: unknown) {
      console.error("[IaC Backend] Error parsing response:", error);
      res.status(500).json({ 
        error: "Failed to parse AI response",
        details: error instanceof Error ? error.message : "Unknown error",
        rawResponse: fullResponse
      });
    }
  } catch (error: unknown) {
    console.error("[IaC Backend] Error generating IaC:", error);
    res.status(500).json({ 
      error: "Failed to generate infrastructure code",
      details: error instanceof Error ? error.message : "Unknown error"
    });
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

    console.log("Parsed data : ", parsedData);

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

export const generateApplicationCode = async (req: Request, res: Response): Promise<void> => {
  console.log("[App Code Backend] Received request to generate application code");
  console.log("[App Code Backend] Request body:", JSON.stringify(req.body, null, 2));
  const { prompt, projectId, umlDiagrams, documentation, infraCode } = req.body;
  console.log("[App Code Backend] Extracted data:", {
    prompt,
    projectId,
    hasUmlDiagrams: !!umlDiagrams,
    hasDocumentation: !!documentation,
    hasInfraCode: !!infraCode
  });

  if (!prompt) {
    console.log("[App Code Backend] Missing prompt in request");
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    console.log("[App Code Backend] Constructing system prompt");
    const systemPrompt = `You are an expert fullstack developer and technical writer.

Given the following app idea and context, generate a complete, production-ready codebase for both the frontend and backend, using best practices. Your response must include:

- **Frontend**: All necessary components, pages, and utility functions, organized in a way that is ready to use in a modern React (or your stack) application.
- **Backend**: All necessary controllers, models, routes, and utility functions, organized for a Node.js/Express (or your stack) backend.
- **Documentation**: A clear, concise README or documentation that explains how to run, build, and use the app.

**Response format (JSON):**
{
  "frontend": {
    "components": { "ComponentName": "code..." },
    "pages": { "PageName": "code..." },
    "utils": { "utilName": "code..." }
  },
  "backend": {
    "controllers": { "ControllerName": "code..." },
    "models": { "ModelName": "code..." },
    "routes": { "RouteName": "code..." },
    "utils": { "utilName": "code..." }
  },
  "documentation": "README or usage instructions here"
}

**Important:**
- Do NOT return empty objects. If a section is not needed, omit it.
- Each code section should contain real, working code (not just placeholders).
- Documentation should be clear and actionable.
- DO NOT include any markdown formatting, code blocks, or explanatory text. Return ONLY the raw JSON object.

Context for code generation:
Prompt: ${prompt}

UML Diagrams:
${JSON.stringify(umlDiagrams, null, 2)}

Documentation:
${documentation || "No documentation provided."}

Infrastructure Code:
${infraCode || "No infrastructure code provided."}`;

    console.log("[App Code Backend] Sending request to OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Generate application code for the following system:
          
Prompt: ${prompt}

UML Diagrams:
${Object.entries(umlDiagrams).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}`
        },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });

    console.log("[App Code Backend] Received response from OpenAI");
    const fullResponse = response.choices[0]?.message?.content || "";
    console.log("[App Code Backend] Full response:", fullResponse);

    try {
      // Clean the response by removing any markdown formatting
      const cleanedResponse = fullResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsedResponse = JSON.parse(cleanedResponse);
      console.log("[App Code Backend] Parsed response:", parsedResponse);

      // Validate and ensure required structure with defaults
      const validatedResponse = {
        frontend: {
          components: parsedResponse.frontend?.components || {},
          pages: parsedResponse.frontend?.pages || {},
          utils: parsedResponse.frontend?.utils || {}
        },
        backend: {
          controllers: parsedResponse.backend?.controllers || {},
          models: parsedResponse.backend?.models || {},
          routes: parsedResponse.backend?.routes || {},
          utils: parsedResponse.backend?.utils || {}
        },
        documentation: parsedResponse.documentation || "No documentation provided."
      };

      // Save the generated code to files if projectId is provided
      if (projectId) {
        const projectDir = path.join(process.cwd(), "workspace", projectId);
        if (!fs.existsSync(projectDir)) {
          fs.mkdirSync(projectDir, { recursive: true });
        }

        // Save frontend code
        const frontendDir = path.join(projectDir, "frontend");
        if (!fs.existsSync(frontendDir)) {
          fs.mkdirSync(frontendDir, { recursive: true });
        }

        // Save frontend components
        const componentsDir = path.join(frontendDir, "components");
        if (!fs.existsSync(componentsDir)) {
          fs.mkdirSync(componentsDir, { recursive: true });
        }
        Object.entries(validatedResponse.frontend.components).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(componentsDir, filename), content as string);
        });

        // Save frontend pages
        const pagesDir = path.join(frontendDir, "pages");
        if (!fs.existsSync(pagesDir)) {
          fs.mkdirSync(pagesDir, { recursive: true });
        }
        Object.entries(validatedResponse.frontend.pages).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(pagesDir, filename), content as string);
        });

        // Save frontend utils
        const frontendUtilsDir = path.join(frontendDir, "utils");
        if (!fs.existsSync(frontendUtilsDir)) {
          fs.mkdirSync(frontendUtilsDir, { recursive: true });
        }
        Object.entries(validatedResponse.frontend.utils).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(frontendUtilsDir, filename), content as string);
        });

        // Save backend code
        const backendDir = path.join(projectDir, "backend");
        if (!fs.existsSync(backendDir)) {
          fs.mkdirSync(backendDir, { recursive: true });
        }

        // Save backend controllers
        const controllersDir = path.join(backendDir, "controllers");
        if (!fs.existsSync(controllersDir)) {
          fs.mkdirSync(controllersDir, { recursive: true });
        }
        Object.entries(validatedResponse.backend.controllers).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(controllersDir, filename), content as string);
        });

        // Save backend models
        const modelsDir = path.join(backendDir, "models");
        if (!fs.existsSync(modelsDir)) {
          fs.mkdirSync(modelsDir, { recursive: true });
        }
        Object.entries(validatedResponse.backend.models).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(modelsDir, filename), content as string);
        });

        // Save backend routes
        const routesDir = path.join(backendDir, "routes");
        if (!fs.existsSync(routesDir)) {
          fs.mkdirSync(routesDir, { recursive: true });
        }
        Object.entries(validatedResponse.backend.routes).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(routesDir, filename), content as string);
        });

        // Save backend utils
        const backendUtilsDir = path.join(backendDir, "utils");
        if (!fs.existsSync(backendUtilsDir)) {
          fs.mkdirSync(backendUtilsDir, { recursive: true });
        }
        Object.entries(validatedResponse.backend.utils).forEach(([filename, content]) => {
          fs.writeFileSync(path.join(backendUtilsDir, filename), content as string);
        });

        // Save documentation
        fs.writeFileSync(path.join(projectDir, "README.md"), validatedResponse.documentation);

        // Save appCode to the project
        try {
          const { getProjectById, saveProject } = await import("../utils/projectFileStore");
          const project = await getProjectById(projectId);
          if (project) {
            project.appCode = validatedResponse;
            await saveProject(project);
          }
        } catch (err) {
          console.error("[App Code Backend] Error saving appCode to project:", err);
        }
      }

      res.json(validatedResponse);
    } catch (error: unknown) {
      console.error("[App Code Backend] Error parsing response:", error);
      res.status(500).json({ 
        error: "Failed to parse AI response",
        details: error instanceof Error ? error.message : "Unknown error",
        rawResponse: fullResponse
      });
    }
  } catch (error: unknown) {
    console.error("[App Code Backend] Error generating application code:", error);
    res.status(500).json({ 
      error: "Failed to generate application code",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
