// src/controllers/openAIController.ts
import express from "express";
import { Request, Response,  } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import Anthropic from '@anthropic-ai/sdk';
import path from "path";
import fs from "fs";
import { memoryManager, type MemoryOptimizedJob } from "../utils/memoryManager";
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

interface IaCJob extends MemoryOptimizedJob {
  status: string;
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  lastAccessed?: Date;
}

const diagramJobs: Record<string, DiagramJob> = {};
const iacJobs: Record<string, IaCJob> = {};

// Set up memory management for job stores
memoryManager.setupJobStoreCleanup(diagramJobs, "diagramJobs", 20 * 60 * 1000, 50); // 20 min, max 50 jobs
memoryManager.setupJobStoreCleanup(iacJobs, "iacJobs", 30 * 60 * 1000, 50); // 30 min, max 50 jobs

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
    console.log(`[IaC] Job started: jobId=${jobId}, projectId=${projectId}`);
    console.log(`[IaC] Prompt: ${prompt}`);
    iacJobs[jobId] = { 
      ...iacJobs[jobId],
      status: "processing", 
      progress: 10,
      lastAccessed: new Date()
    };
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

**CRITICAL: This is BARE-BONES INFRASTRUCTURE PROVISIONING ONLY. Do not assume any application code, zip files, or deployment packages exist.**

**INFRASTRUCTURE ANALYSIS STEPS:**
1. Determine application type (web app, API, data processing, mobile backend, etc.)
2. Identify required services (compute, storage, database, messaging, etc.)
3. Assess scale requirements (simple prototype vs production-ready)
4. Generate minimal but complete infrastructure with placeholder deployment packages

**MODERN TERRAFORM REQUIREMENTS:**
1. Use Terraform 1.5+ syntax with proper required_providers block
2. AWS Provider version "~> 5.0" with all modern resource configurations
3. Use random_string for unique resource naming to prevent conflicts
4. Include proper dependencies and resource ordering
5. For Lambda functions, use placeholder deployment packages or dummy zip files

**AWS PROVIDER BEST PRACTICES:**
- **Lambda Functions**: Use placeholder deployment packages with proper configuration
  - Use \`filename\` parameter with a dummy zip file path or inline code
  - Use nodejs18.x, nodejs20.x, or nodejs22.x runtime only
  - Include proper IAM roles and policies
  - DO NOT use invalid "code" blocks - they don't exist in Terraform
- **RDS**: Use aws_db_instance for simple databases, aws_rds_cluster + aws_rds_cluster_instance for Aurora (both require engine parameter)
- **S3**: Use separate resources for aws_s3_bucket_public_access_block and aws_s3_bucket_policy (NO acl parameter)
- **IAM**: Use least-privilege policies with specific resource ARNs
- **API Gateway**: Use REGIONAL endpoints with proper CORS configuration

**LAMBDA FUNCTION CORRECT SYNTAX:**
resource "aws_lambda_function" "example" {
  function_name = "example-function-$\{random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn
  
  # Use inline code for placeholder deployment
  filename      = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  timeout     = 30
  memory_size = 256
  
  environment {
    variables = {
      NODE_ENV = "production"
    }
  }
}

# Create placeholder zip file
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "placeholder.zip"
  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Hello from Lambda!' }) });"
    filename = "index.js"
  }
}

**INFRASTRUCTURE PATTERNS BY APPLICATION TYPE:**

**Simple Web App:**
- S3 bucket for frontend hosting + CloudFront
- Lambda for API + API Gateway
- DynamoDB for data storage
- All with placeholder deployment packages

**REST API:**
- Lambda functions for endpoints with placeholder code
- API Gateway with proper resources/methods
- RDS or DynamoDB based on data needs
- S3 for file storage if needed

**Data Processing App:**
- Lambda for processing with placeholder code
- SQS for queuing
- S3 for data storage
- DynamoDB for metadata

**Real-time App:**
- WebSocket API Gateway
- Lambda for real-time processing with placeholder code
- DynamoDB with streams
- SNS/SQS for messaging

**AI/ML App:**
- SageMaker for model hosting
- Lambda for API layer with placeholder code
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
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
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
# Include placeholder deployment packages for Lambda functions

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
- For Lambda functions, always include placeholder deployment packages
- NEVER use invalid "code" blocks in Lambda functions
- This is infrastructure provisioning only - no application deployment assumptions

**ANALYSIS EXAMPLES:**

"AI meal planning app"
→ Generate: Cognito + Lambda (with placeholder code) + DynamoDB + S3 + API Gateway

"Real-time chat application" 
→ Generate: Cognito + WebSocket API + Lambda (with placeholder code) + DynamoDB with streams + SNS

"Todo app with user authentication"
→ Generate: Cognito + API Gateway + Lambda (with placeholder code) + DynamoDB + S3 (full web app stack)

"File processing service"
→ Generate: S3 + Lambda (with placeholder code) + SQS + DynamoDB for job tracking

RESPOND WITH ONLY RAW TERRAFORM HCL CODE. Start immediately with "terraform {" - no markdown, no explanations, no formatting.
`;
    iacJobs[jobId] = {
      ...iacJobs[jobId],
      progress: 20,
      lastAccessed: new Date()
    };
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
    iacJobs[jobId] = {
      ...iacJobs[jobId],
      progress: 60,
      lastAccessed: new Date()
    };
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
    iacJobs[jobId] = { 
      ...iacJobs[jobId],
      status: "completed", 
      progress: 100, 
      result: { code: cleanTerraformCode },
      endTime: new Date(),
      lastAccessed: new Date()
    };
  } catch (error: any) {
    console.error(`[IaC] Error in processIaCJob for jobId=${jobId}, projectId=${projectId}:`, error);
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
  console.log("[Agentic Code Gen] Starting sophisticated code generation");
  console.log("[Agentic Code Gen] Request body:", JSON.stringify(req.body, null, 2));
  
  const { prompt, projectId, umlDiagrams, documentation, infraCode } = req.body;
  console.log("[Agentic Code Gen] Extracted data:", {
    prompt,
    projectId,
    hasUmlDiagrams: !!umlDiagrams,
    hasDocumentation: !!documentation,
    hasInfraCode: !!infraCode
  });

  if (!prompt) {
    console.log("[Agentic Code Gen] Missing prompt in request");
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  if (!umlDiagrams || Object.keys(umlDiagrams).length === 0) {
    console.log("[Agentic Code Gen] No UML diagrams provided - falling back to basic generation");
    return generateBasicApplicationCode(req, res);
  }

  try {
    console.log("[Agentic Code Gen] Starting agentic code generation pipeline");
    
    // Phase 1: Analyze diagrams and extract components
    const analysisResult = await analyzeDiagramsAndExtractComponents(umlDiagrams, prompt);
    
    // Phase 2: Decompose components into focused subcomponents
    const decompositionResult = await decomposeComponentsIntoSubcomponents(analysisResult);
    
    // Phase 3: Generate code for each component individually
    const codeGenerationResult = await generateIndividualComponents(decompositionResult, prompt, infraCode);
    
    // Phase 4: Generate integration code using sequence diagram
    const integrationResult = await generateIntegrationCode(
      codeGenerationResult, 
      umlDiagrams.sequence || umlDiagrams.sequenceDiagram, 
      prompt
    );
    
    // Phase 5: Assemble final application
    const finalApplication = await assembleFinalApplication(
      codeGenerationResult,
      integrationResult,
      documentation
    );

    console.log("[Agentic Code Gen] Successfully generated application code");

    // Save results if projectId provided
    if (projectId) {
      await saveGeneratedCodeToProject(projectId, finalApplication);
    }

    res.json(finalApplication);

  } catch (error: unknown) {
    console.error("[Agentic Code Gen] Error in agentic code generation:", error);
    res.status(500).json({ 
      error: "Failed to generate application code using agentic approach",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Phase 1: Analyze diagrams and extract components
async function analyzeDiagramsAndExtractComponents(umlDiagrams: any, prompt: string) {
  console.log("[Agentic Code Gen] Phase 1: Analyzing diagrams and extracting components");
  
  const analysisPrompt = `You are an expert software architect. Analyze the following UML diagrams and application requirements to extract a comprehensive list of components and their responsibilities.

Application Requirements: ${prompt}

UML Diagrams:
${Object.entries(umlDiagrams).map(([name, content]) => `${name}:\n${content}`).join('\n\n')}

Analyze and return a JSON response with the following structure:
{
  "components": [
    {
      "name": "ComponentName",
      "type": "frontend|backend|shared",
      "category": "controller|service|model|repository|component|page|utility",
      "responsibilities": ["responsibility1", "responsibility2"],
      "dependencies": ["dependency1", "dependency2"],
      "complexity": "low|medium|high",
      "methods": ["method1", "method2"],
      "interfaces": ["interface1", "interface2"]
    }
  ],
  "relationships": [
    {
      "from": "ComponentA",
      "to": "ComponentB", 
      "type": "uses|extends|implements|calls",
      "description": "relationship description"
    }
  ],
  "dataFlow": [
    {
      "source": "ComponentA",
      "target": "ComponentB",
      "data": "data description",
      "direction": "bidirectional|unidirectional"
    }
  ],
  "architecture": {
    "pattern": "MVC|MVP|MVVM|layered|microservices",
    "layers": ["presentation", "business", "data"],
    "concerns": ["authentication", "validation", "logging", "error-handling"]
  }
}

Focus on:
1. Extracting ALL components mentioned in diagrams
2. Understanding component responsibilities and boundaries
3. Identifying relationships and dependencies
4. Determining complexity levels for generation planning
5. Mapping data flow between components

Return ONLY the JSON response, no explanations.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: analysisPrompt }],
    max_tokens: 3000,
    temperature: 0.3,
  });

  const analysisResult = JSON.parse(response.choices[0]?.message?.content?.trim() || "{}");
  console.log("[Agentic Code Gen] Phase 1 Complete: Extracted", analysisResult.components?.length || 0, "components");
  return analysisResult;
}

// Phase 2: Decompose components into focused subcomponents
async function decomposeComponentsIntoSubcomponents(analysisResult: any) {
  console.log("[Agentic Code Gen] Phase 2: Decomposing complex components");
  
  const complexComponents = analysisResult.components?.filter((comp: any) => comp.complexity === 'high') || [];
  
  if (complexComponents.length === 0) {
    console.log("[Agentic Code Gen] No complex components to decompose");
    return analysisResult;
  }

  const decompositionPrompt = `You are an expert in software architecture and component design. The following components have been identified as complex and need to be decomposed into smaller, focused subcomponents.

Complex Components:
${JSON.stringify(complexComponents, null, 2)}

Architecture Context:
${JSON.stringify(analysisResult.architecture, null, 2)}

Decompose each complex component into smaller, atomic subcomponents following these principles:
1. Single Responsibility Principle - each subcomponent should have ONE clear purpose
2. Separation of Concerns - UI, business logic, data access should be separate
3. High Cohesion, Low Coupling
4. Atomic Methods - each method should do one thing well

Return JSON with this structure:
{
  "decomposedComponents": [
    {
      "originalComponent": "ComponentName",
      "subcomponents": [
        {
          "name": "SubcomponentName",
          "type": "frontend|backend|shared",
          "category": "controller|service|model|repository|component|page|utility",
          "responsibilities": ["specific responsibility"],
          "methods": ["atomicMethod1", "atomicMethod2"],
          "complexity": "low|medium",
          "interfaces": ["interface if needed"],
          "rationale": "why this subcomponent exists"
        }
      ]
    }
  ],
  "newRelationships": [
    {
      "from": "SubcomponentA",
      "to": "SubcomponentB",
      "type": "uses|calls|implements",
      "description": "relationship description"
    }
  ]
}

Return ONLY the JSON response.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: decompositionPrompt }],
    max_tokens: 3000,
    temperature: 0.3,
  });

  const decompositionResult = JSON.parse(response.choices[0]?.message?.content?.trim() || "{}");
  
  // Merge decomposed components back into the main analysis
  if (decompositionResult.decomposedComponents) {
    const decomposedComponentNames = new Set();
    
    // Add new subcomponents
    decompositionResult.decomposedComponents.forEach((decomp: any) => {
      decomposedComponentNames.add(decomp.originalComponent);
      analysisResult.components.push(...decomp.subcomponents);
    });
    
    // Remove original complex components that were decomposed
    analysisResult.components = analysisResult.components.filter((comp: any) => 
      !decomposedComponentNames.has(comp.name)
    );
    
    // Add new relationships
    if (decompositionResult.newRelationships) {
      analysisResult.relationships.push(...decompositionResult.newRelationships);
    }
  }
  
  console.log("[Agentic Code Gen] Phase 2 Complete: Total components after decomposition:", analysisResult.components?.length || 0);
  return analysisResult;
}

// Phase 3: Generate code for each component individually
async function generateIndividualComponents(analysisResult: any, prompt: string, infraCode: string) {
  console.log("[Agentic Code Gen] Phase 3: Generating individual components");
  
  const components = analysisResult.components || [];
  const relationships = analysisResult.relationships || [];
  const architecture = analysisResult.architecture || {};
  
  const generatedComponents: any = {
    frontend: { components: {}, pages: {}, utils: {} },
    backend: { controllers: {}, models: {}, routes: {}, utils: {}, services: {} },
    shared: { interfaces: {}, types: {}, utils: {} }
  };

  // Generate components in batches to avoid overwhelming the AI
  const batchSize = 3;
  for (let i = 0; i < components.length; i += batchSize) {
    const batch = components.slice(i, i + batchSize);
    
    console.log(`[Agentic Code Gen] Generating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(components.length/batchSize)}`);
    
    for (const component of batch) {
      try {
        const componentCode = await generateSingleComponent(
          component, 
          relationships.filter((rel: any) => rel.from === component.name || rel.to === component.name),
          architecture,
          prompt,
          infraCode
        );
        
        // Organize generated code by type and category
        const category = mapComponentToCategory(component);
        if (componentCode && componentCode.trim()) {
          generatedComponents[component.type][category][component.name] = componentCode;
        }
        
      } catch (error) {
        console.error(`[Agentic Code Gen] Error generating component ${component.name}:`, error);
        // Continue with other components
      }
    }
    
    // Small delay between batches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("[Agentic Code Gen] Phase 3 Complete: Generated", 
    Object.values(generatedComponents).reduce((total: number, tier: any) => 
      total + Object.values(tier).reduce((subtotal: number, category: any) => subtotal + Object.keys(category).length, 0), 0
    ), "components");
  
  return generatedComponents;
}

// Generate a single focused component
async function generateSingleComponent(
  component: any, 
  componentRelationships: any[], 
  architecture: any, 
  appPrompt: string,
  infraCode: string
) {
  const componentPrompt = `You are an expert ${component.type} developer. Generate high-quality, production-ready code for the following component.

Application Context: ${appPrompt}

Component Details:
- Name: ${component.name}
- Type: ${component.type}
- Category: ${component.category}
- Responsibilities: ${component.responsibilities?.join(', ')}
- Methods: ${component.methods?.join(', ')}
- Interfaces: ${component.interfaces?.join(', ')}

Relationships:
${componentRelationships.map(rel => `- ${rel.type} ${rel.from === component.name ? rel.to : rel.from}: ${rel.description}`).join('\n')}

Architecture Pattern: ${architecture.pattern || 'layered'}
Architecture Layers: ${architecture.layers?.join(', ')}

Infrastructure Context (for backend components):
${component.type === 'backend' ? infraCode?.substring(0, 1000) + '...' : 'N/A'}

Requirements:
1. Generate ONLY the code for this specific component
2. Follow ${component.type === 'frontend' ? 'React/TypeScript' : 'Node.js/TypeScript'} best practices
3. Implement ALL responsibilities and methods
4. Use proper error handling and validation
5. Include necessary imports and dependencies
6. Follow the ${architecture.pattern} pattern
7. Make methods atomic and focused
8. Use TypeScript interfaces for type safety
9. Include proper JSDoc comments
10. Handle async operations properly

${component.type === 'frontend' ? `
Frontend Specific:
- Use modern React hooks and functional components
- Implement proper state management
- Use Material-UI or styled-components for styling
- Handle loading and error states
- Implement proper accessibility
` : `
Backend Specific:
- Use Express.js patterns
- Implement proper middleware
- Use async/await for database operations
- Include input validation
- Implement proper error responses
- Use dependency injection where appropriate
`}

Return ONLY the code for this component. No explanations, no markdown formatting, just clean, executable code.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: componentPrompt }],
    max_tokens: 2000,
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

// Helper function to map component to file category
function mapComponentToCategory(component: any): string {
  const categoryMap: any = {
    'controller': 'controllers',
    'service': 'services', 
    'model': 'models',
    'repository': 'models', // repositories often go with models
    'component': 'components',
    'page': 'pages',
    'utility': 'utils',
    'route': 'routes'
  };
  
  return categoryMap[component.category] || 'utils';
}

// Phase 4: Generate integration code using sequence diagram
async function generateIntegrationCode(generatedComponents: any, sequenceDiagram: string, prompt: string) {
  console.log("[Agentic Code Gen] Phase 4: Generating integration code");
  
  if (!sequenceDiagram) {
    console.log("[Agentic Code Gen] No sequence diagram provided, skipping integration generation");
    return {};
  }

  const integrationPrompt = `You are an expert in software integration and API design. Using the sequence diagram and generated components, create integration code that connects all components according to the specified flow.

Application Context: ${prompt}

Sequence Diagram:
${sequenceDiagram}

Generated Components Summary:
Frontend: ${Object.keys(generatedComponents.frontend.components || {}).join(', ')}
Backend Controllers: ${Object.keys(generatedComponents.backend.controllers || {}).join(', ')}
Backend Services: ${Object.keys(generatedComponents.backend.services || {}).join(', ')}
Backend Models: ${Object.keys(generatedComponents.backend.models || {}).join(', ')}

Generate integration code including:
1. API endpoints and routing
2. Service layer integration
3. Database connection and setup
4. Frontend API client
5. Error handling middleware
6. Authentication middleware (if needed)
7. Main application entry points

Return JSON with this structure:
{
  "backend": {
    "routes": {
      "main.ts": "main routing file",
      "api.ts": "API route definitions"
    },
    "middleware": {
      "auth.ts": "authentication middleware",
      "error.ts": "error handling middleware"
    },
    "config": {
      "database.ts": "database configuration",
      "app.ts": "application setup"
    }
  },
  "frontend": {
    "services": {
      "api.ts": "API client service",
      "auth.ts": "authentication service"
    },
    "hooks": {
      "useApi.ts": "API hooks",
      "useAuth.ts": "authentication hooks"
    }
  },
  "shared": {
    "types": {
      "api.ts": "shared API types",
      "models.ts": "shared model types"
    }
  }
}

Focus on creating clean, maintainable integration code that follows the sequence diagram flow.
Return ONLY the JSON response.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: integrationPrompt }],
    max_tokens: 3000,
    temperature: 0.3,
  });

  const integrationResult = JSON.parse(response.choices[0]?.message?.content?.trim() || "{}");
  console.log("[Agentic Code Gen] Phase 4 Complete: Generated integration code");
  return integrationResult;
}

// Phase 5: Assemble final application
async function assembleFinalApplication(generatedComponents: any, integrationCode: any, documentation: string) {
  console.log("[Agentic Code Gen] Phase 5: Assembling final application");
  
  // Merge generated components with integration code
  const finalApplication = {
    frontend: {
      components: generatedComponents.frontend.components || {},
      pages: generatedComponents.frontend.pages || {},
      utils: { ...generatedComponents.frontend.utils, ...integrationCode.frontend?.services },
      hooks: integrationCode.frontend?.hooks || {},
      services: integrationCode.frontend?.services || {}
    },
    backend: {
      controllers: generatedComponents.backend.controllers || {},
      models: generatedComponents.backend.models || {},
      services: generatedComponents.backend.services || {},
      routes: { ...generatedComponents.backend.routes, ...integrationCode.backend?.routes },
      utils: generatedComponents.backend.utils || {},
      middleware: integrationCode.backend?.middleware || {},
      config: integrationCode.backend?.config || {}
    },
    shared: {
      types: { ...generatedComponents.shared.types, ...integrationCode.shared?.types },
      interfaces: generatedComponents.shared.interfaces || {},
      utils: generatedComponents.shared.utils || {}
    },
    documentation: documentation || "Generated using agentic code generation system"
  };
  
  console.log("[Agentic Code Gen] Phase 5 Complete: Final application assembled");
  return finalApplication;
}

// Save generated code to project
async function saveGeneratedCodeToProject(projectId: string, application: any) {
  try {
    const { getProjectById, saveProject } = await import("../utils/projectFileStore");
    const project = await getProjectById(projectId);
    if (project) {
      project.appCode = application;
      await saveProject(project);
      console.log("[Agentic Code Gen] Saved generated code to project");
    }
  } catch (err) {
    console.error("[Agentic Code Gen] Error saving code to project:", err);
  }
}

// Fallback to basic generation if no UML diagrams
async function generateBasicApplicationCode(req: Request, res: Response): Promise<void> {
  // Keep the existing basic generation as fallback
  const { prompt, projectId } = req.body;
  
  console.log("[Basic Code Gen] Falling back to basic code generation");
  
  const basicResponse = {
    frontend: {
      components: { "App.tsx": "// Basic React app component\nexport default function App() { return <div>Hello World</div>; }" },
      pages: {},
      utils: {}
    },
    backend: {
      controllers: { "main.js": "// Basic Express controller\nmodule.exports = { hello: (req, res) => res.json({message: 'Hello'}) };" },
      models: {},
      routes: {},
      utils: {}
    },
    documentation: "Basic application generated without UML diagrams"
  };
  
  if (projectId) {
    await saveGeneratedCodeToProject(projectId, basicResponse);
  }
  
  res.json(basicResponse);
}
