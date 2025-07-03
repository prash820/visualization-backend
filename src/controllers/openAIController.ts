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

// In-memory job store for diagram jobs
const diagramJobs: Record<string, { status: string; progress: number; result?: any; error?: string }> = {};

export const generateVisualization = async (req: Request, res: Response) => {
  const { prompt, diagramType } = req.body;
  if (!prompt || !diagramType) {
    return res.status(400).json({ error: "Missing required parameters." });
  }
  const jobId = generateJobId();
  diagramJobs[jobId] = { status: "pending", progress: 0 };
  processDiagramJob(jobId, prompt, diagramType);
  res.json({ jobId, status: "accepted" });
};

async function processDiagramJob(jobId: string, prompt: string, diagramType: string) {
  try {
    diagramJobs[jobId] = { status: "processing", progress: 10 };
    type DiagramType = "flowchart" | "architecture" | "sequence" | "uml";
    const systemPrompt: Record<DiagramType, string> = {
      flowchart: `You are an AI assistant specialized in generating flowcharts based on user prompts.\nReturn only valid JSON with two arrays: \"nodes\" and \"edges\".\nEach node should have an \"id\", \"label\", \"role\", and a default position.\nEach edge should connect nodes using \"sourceLabel\", \"targetLabel\" and edge label that says what is happening between steps.\nRole means the type of node, like start/end, process, decision, input output, etc\nDo not include any extra text.`,
      architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.\n...`,
      sequence: `You are an AI assistant specialized in generating sequence diagrams based on user prompts.\nReturn only valid JSON with two arrays: \"nodes\" and \"edges\".\nNodes represent actors or steps, and edges represent the flow of interactions.\nFormat example: { \"nodes\": [{ \"label\": \"Actor or Step\" }], \"edges\": [{ \"sourceLabel\": \"Label\", \"targetLabel\": \"Label\", \"label\": \"Message\" }] }\nDo not include any extra text.`,
      uml: `You are an AI assistant specialized in generating UML class diagrams based on user prompts.\nReturn only valid JSON with two arrays: \"nodes\" and \"edges\".\nEach node represents a class (with a \"label\"), and edges represent relationships between classes.\nFormat example: { \"nodes\": [{ \"label\": \"ClassName\" }], \"edges\": [{ \"sourceLabel\": \"ClassName\", \"targetLabel\": \"ClassName\", \"label\": \"Relationship\" }] }\nDo not include any extra text.`
    };
    diagramJobs[jobId].progress = 20;
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        { role: "system", content: systemPrompt[diagramType as DiagramType] },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });
    diagramJobs[jobId].progress = 60;
    const fullResponse = response.choices[0]?.message?.content || "";
    let parsedData;
    if (diagramType === "architecture") {
      parsedData = parseArchitectureResponse(fullResponse);
    } else {
      parsedData = parseGenericResponse(fullResponse);
    }
    diagramJobs[jobId] = { status: "completed", progress: 100, result: parsedData };
  } catch (error: any) {
    diagramJobs[jobId] = { status: "failed", progress: 100, error: error.message || "Unknown error" };
  }
}

export const getDiagramJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  if (!jobId || !diagramJobs[jobId]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(diagramJobs[jobId]);
};

// In-memory job store for IaC jobs
const iacJobs: Record<string, { status: string; progress: number; result?: any; error?: string }> = {};

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
  iacJobs[jobId] = { status: "pending", progress: 0 };
  // Start background job
  processIaCJob(jobId, prompt, projectId, umlDiagrams);
  res.json({ jobId, status: "accepted" });
};

async function processIaCJob(jobId: string, prompt: string, projectId: string, umlDiagrams: any) {
  try {
    console.log(`[IaC] Job started: jobId=${jobId}, projectId=${projectId}`);
    console.log(`[IaC] Prompt: ${prompt}`);
    iacJobs[jobId] = { status: "processing", progress: 10 };
    const systemPrompt = `
You are a senior cloud architect and Terraform expert specializing in AWS infrastructure design for modern applications.

**CRITICAL OUTPUT FORMAT: You must respond with ONLY pure Terraform HCL code. NO markdown formatting, NO code fences, NO explanations, NO backticks, NO text blocks. Just raw .tf file content that can be directly saved and executed.**

**EXAMPLE OF WHAT NOT TO DO:**
Do not wrap in code fences like this:
\`\`\`hcl
terraform {
  # DON'T include these backticks or code fences
}
\`\`\`

**EXAMPLE OF CORRECT OUTPUT:**
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

**CRITICAL: Analyze the user's prompt first to understand their application needs, then generate ONLY the infrastructure required for that specific application.**

**INFRASTRUCTURE ANALYSIS STEPS:**
1. Determine application type (web app, API, data processing, mobile backend, etc.)
2. Identify required services (compute, storage, database, messaging, etc.)
3. Assess scale requirements (simple prototype vs production-ready)
4. Generate minimal but complete infrastructure

**MODERN TERRAFORM REQUIREMENTS:**
1. Use Terraform 1.5+ syntax with proper required_providers block
2. AWS Provider version "~> 5.0" with all modern resource configurations
3. Use random_string for unique resource naming to prevent conflicts
4. Include proper dependencies and resource ordering

**AWS PROVIDER BEST PRACTICES:**
- **RDS**: Use aws_db_instance for simple databases, aws_rds_cluster + aws_rds_cluster_instance for Aurora (both require engine parameter)
- **S3**: Use separate resources for aws_s3_bucket_public_access_block and aws_s3_bucket_policy (NO acl parameter)
- **Lambda**: Use nodejs18.x, nodejs20.x, or nodejs22.x runtime only
- **IAM**: Use least-privilege policies with specific resource ARNs
- **API Gateway**: Use REGIONAL endpoints with proper CORS configuration

**INFRASTRUCTURE PATTERNS BY APPLICATION TYPE:**

**Simple Web App:**
- S3 bucket for frontend hosting + CloudFront
- Lambda for API + API Gateway
- DynamoDB for data storage

**REST API:**
- Lambda functions for endpoints
- API Gateway with proper resources/methods
- RDS or DynamoDB based on data needs
- S3 for file storage if needed

**Data Processing App:**
- Lambda for processing
- SQS for queuing
- S3 for data storage
- DynamoDB for metadata

**Real-time App:**
- WebSocket API Gateway
- Lambda for real-time processing
- DynamoDB with streams
- SNS/SQS for messaging

**AI/ML App:**
- SageMaker for model hosting
- Lambda for API layer
- S3 for model artifacts
- Cognito for authentication

**REQUIRED TERRAFORM STRUCTURE:**
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Generate ONLY resources needed for the specific application
# Example resources based on analysis

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

output "main_url" {
  value = # appropriate URL based on infrastructure
  description = "Main application URL"
}

**CRITICAL REQUIREMENTS:**
- NEVER use deprecated aws_s3_bucket acl parameter
- ALWAYS include engine parameter for RDS resources
- ALWAYS use random_string suffix for resource names
- ONLY generate resources the application actually needs
- Use appropriate database type (DynamoDB for NoSQL, RDS for relational)
- Include proper IAM roles with minimal permissions
- Add meaningful outputs for application URLs and endpoints
- NEVER wrap output in markdown code fences or backticks

**ANALYSIS EXAMPLES:**

"Todo app with user authentication"
→ Generate: Cognito + API Gateway + Lambda + DynamoDB + S3 (full web app stack)

"Real-time chat application" 
→ Generate: Cognito + WebSocket API + Lambda + DynamoDB with streams + SNS

"AI meal planning app"
→ Generate: Cognito + SageMaker + Lambda + DynamoDB + S3 + API Gateway

"File processing service"
→ Generate: S3 + Lambda + SQS + DynamoDB for job tracking

"E-commerce platform"
→ Generate: Cognito + API Gateway + Lambda + RDS + S3 + CloudFront + SES

RESPOND WITH ONLY RAW TERRAFORM HCL CODE. Start immediately with "terraform {" - no markdown, no explanations, no formatting.
`;
    iacJobs[jobId].progress = 20;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate infrastructure code for the following system:\n\nPrompt: ${prompt}\n\nUML Diagrams:\n${Object.entries(umlDiagrams || {}).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}`
        },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });
    iacJobs[jobId].progress = 60;
    const terraformCode = response.choices[0]?.message?.content?.trim() || "";
    console.log(`[IaC] OpenAI raw response for jobId=${jobId}:`, response.choices[0]?.message?.content);
    
    // Post-process to ensure clean Terraform code (remove any markdown formatting)
    const cleanTerraformCode = terraformCode
      .replace(/^```hcl\s*/gm, '')     // Remove opening code fences
      .replace(/^```\s*$/gm, '')       // Remove closing code fences
      .replace(/^\s*```.*$/gm, '')     // Remove any other code fence variants
      .trim();
    
    console.log(`[IaC] Cleaned terraformCode length: ${cleanTerraformCode.length}`);
    
    if (!cleanTerraformCode) {
      console.error(`[IaC] No Terraform code generated for jobId=${jobId}, projectId=${projectId}`);
    }
    // Save the generated code to a file if projectId is provided
    if (projectId) {
      const projectDir = path.join(process.cwd(), "terraform-runner/workspace", projectId);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
        console.log(`[IaC] Created project directory: ${projectDir}`);
      }
      fs.writeFileSync(path.join(projectDir, "terraform.tf"), cleanTerraformCode);
      console.log(`[IaC] Saved terraform.tf for projectId=${projectId} at ${projectDir}`);
      try {
        const { getProjectById, saveProject } = await import("../utils/projectFileStore");
        const project = await getProjectById(projectId);
        if (project) {
          project.infraCode = cleanTerraformCode;
          await saveProject(project);
        }
      } catch (err) {
        console.error("[IaC Backend] Error saving infraCode to project:", err);
      }
    }
    iacJobs[jobId] = { status: "completed", progress: 100, result: { code: cleanTerraformCode } };
  } catch (error: any) {
    console.error(`[IaC] Error in processIaCJob for jobId=${jobId}, projectId=${projectId}:`, error);
    iacJobs[jobId] = { status: "failed", progress: 100, error: error.message || "Unknown error" };
  }
}

export const getIaCJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  if (!jobId || !iacJobs[jobId]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(iacJobs[jobId]);
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
      model: "gpt-4o",
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
        const projectDir = path.join(process.cwd(), "terraform-runner/workspace", projectId);
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
