"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourcesByCategory = exports.getResourcesOverview = exports.getWorkspaceDetails = exports.cleanupAllOrphanedResources = exports.cleanupOrphanedResource = exports.listOrphanedResources = exports.getAppCreationStatus = exports.getConceptStatus = exports.approveConceptAndBuild = exports.generateConceptForValidation = void 0;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
// Job tracking for concept generation
const conceptJobs = {};
// Job tracking for app building (after approval)
const appCreationJobs = {};
function generateJobId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
// 🔍 Step 1: Generate concept and diagrams for validation
const generateConceptForValidation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idea, userType = "indie_hacker" } = req.body;
    if (!idea) {
        res.status(400).json({
            error: "Missing app idea",
            message: "Please describe your app idea"
        });
        return;
    }
    const jobId = generateJobId('concept');
    // Initialize concept job tracking
    conceptJobs[jobId] = {
        status: 'processing',
        progress: 0,
        currentStep: 'Analyzing your idea...',
        startTime: new Date()
    };
    // Start async concept generation
    generateConceptAsync(jobId, idea, userType);
    res.json({
        jobId,
        message: "Generating app concept for your review...",
        status: 'processing'
    });
});
exports.generateConceptForValidation = generateConceptForValidation;
// 🚀 Step 2: User approves concept, build the actual app
const approveConceptAndBuild = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { conceptJobId, approvedConcept, modifications } = req.body;
    if (!conceptJobId || !conceptJobs[conceptJobId]) {
        res.status(400).json({
            error: "Invalid concept job ID",
            message: "Please generate a concept first"
        });
        return;
    }
    const conceptJob = conceptJobs[conceptJobId];
    if (conceptJob.status !== 'completed') {
        res.status(400).json({
            error: "Concept not ready",
            message: "Please wait for concept generation to complete"
        });
        return;
    }
    const buildJobId = generateJobId('build');
    // Initialize build job tracking
    appCreationJobs[buildJobId] = {
        status: 'processing',
        progress: 0,
        currentStep: 'Starting app development...',
        startTime: new Date()
    };
    // Use approved concept or original concept
    const finalConcept = approvedConcept || ((_a = conceptJob.result) === null || _a === void 0 ? void 0 : _a.concept);
    // Start async app building
    buildApprovedAppAsync(buildJobId, finalConcept, modifications);
    res.json({
        buildJobId,
        message: "Building your approved app... This usually takes 60-90 seconds",
        status: 'processing'
    });
});
exports.approveConceptAndBuild = approveConceptAndBuild;
// 📊 Get concept generation status
const getConceptStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!conceptJobs[jobId]) {
        res.status(404).json({ error: "Concept job not found" });
        return;
    }
    const job = conceptJobs[jobId];
    res.json({
        jobId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        result: job.result,
        error: job.error,
        duration: job.endTime ?
            Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000) :
            Math.round((new Date().getTime() - job.startTime.getTime()) / 1000)
    });
});
exports.getConceptStatus = getConceptStatus;
// 📊 Get app creation status
const getAppCreationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    if (!appCreationJobs[jobId]) {
        res.status(404).json({ error: "App creation job not found" });
        return;
    }
    const job = appCreationJobs[jobId];
    res.json({
        jobId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        result: job.result,
        error: job.error,
        duration: job.endTime ?
            Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000) :
            Math.round((new Date().getTime() - job.startTime.getTime()) / 1000)
    });
});
exports.getAppCreationStatus = getAppCreationStatus;
// 🔥 Generate concept and diagrams for validation
function generateConceptAsync(jobId, idea, userType) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const job = conceptJobs[jobId];
            // Step 1: Generate app concept (30%)
            job.currentStep = "Designing app concept...";
            job.progress = 30;
            const appConcept = yield generateOptimizedConcept(idea, userType);
            // Step 2: Generate all diagrams for validation (90%)
            job.currentStep = "Creating architecture diagrams...";
            job.progress = 60;
            const diagrams = yield generateValidationDiagrams(appConcept);
            // Step 3: Complete concept generation (100%)
            job.currentStep = "Concept ready for review!";
            job.progress = 100;
            job.status = 'completed';
            job.endTime = new Date();
            job.result = {
                concept: appConcept,
                diagrams
            };
            console.log(`✅ Concept generated successfully for job ${jobId}`);
        }
        catch (error) {
            console.error(`❌ Concept generation failed for job ${jobId}:`, error);
            conceptJobs[jobId] = Object.assign(Object.assign({}, conceptJobs[jobId]), { status: 'failed', progress: 100, currentStep: 'Concept generation failed', error: error.message, endTime: new Date() });
        }
    });
}
// 🔥 Build the app after user approval
function buildApprovedAppAsync(jobId, concept, modifications) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const job = appCreationJobs[jobId];
            // Apply any user modifications to the concept
            const finalConcept = modifications ?
                yield applyUserModifications(concept, modifications) :
                concept;
            // Step 1: Generate all code simultaneously (30%)
            job.currentStep = "Writing your app code...";
            job.progress = 30;
            const codeResults = yield Promise.all([
                generateInfrastructureCode(finalConcept),
                generateApplicationCode(finalConcept),
                generateFrontendCode(finalConcept)
            ]);
            const [infraCode, backendCode, frontendCode] = codeResults;
            // Step 2: Deploy infrastructure (60%)
            job.currentStep = "Provisioning cloud infrastructure...";
            job.progress = 60;
            const projectId = `magic-${Date.now()}`;
            const deploymentResult = yield deployInfrastructure(projectId, infraCode);
            if (deploymentResult.status !== 'success') {
                throw new Error(`Infrastructure deployment failed: ${deploymentResult.error}`);
            }
            // Step 3: Deploy application (80%)
            job.currentStep = "Deploying your application...";
            job.progress = 80;
            const appDeployResult = yield deployApplication(projectId, {
                frontend: frontendCode,
                backend: backendCode
            }, deploymentResult.outputs);
            // Step 4: Complete (100%)
            job.currentStep = "Your app is ready!";
            job.progress = 100;
            job.status = 'completed';
            job.endTime = new Date();
            job.result = {
                appUrl: appDeployResult.appUrl,
                adminUrl: appDeployResult.adminUrl,
                projectId
            };
            console.log(`✅ App created successfully for job ${jobId}: ${appDeployResult.appUrl}`);
        }
        catch (error) {
            console.error(`❌ App creation failed for job ${jobId}:`, error);
            appCreationJobs[jobId] = Object.assign(Object.assign({}, appCreationJobs[jobId]), { status: 'failed', progress: 100, currentStep: 'App creation failed', error: error.message, endTime: new Date() });
        }
    });
}
// Generate optimized concept for indie hackers
function generateOptimizedConcept(idea, userType) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `You are an expert at creating MVP apps for ${userType}s.

App Idea: "${idea}"

Create a SIMPLE, focused app concept that:
1. Has ONE core feature that solves the main problem
2. Uses standard web technologies (React frontend, Node.js backend)
3. Can be built and deployed in under 2 hours
4. Has clear monetization potential

Return a JSON object with:
{
  "name": "App Name (max 3 words)",
  "description": "One sentence description",
  "coreFeature": "The main thing this app does",
  "problemSolved": "What problem does this solve for users",
  "targetUser": "Who is this for specifically",
  "valueProposition": "Why would someone pay for this",
  "techStack": {
    "frontend": "React",
    "backend": "Node.js + Express", 
    "database": "DynamoDB",
    "hosting": "AWS Lambda + S3"
  },
  "simpleFeatures": ["core feature", "secondary feature", "nice-to-have feature"],
  "userJourney": ["user does X", "app helps with Y", "user gets Z result"]
}

Keep it SIMPLE and FOCUSED. No authentication, no complex workflows, just the core value.`;
        const response = yield openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
        });
        return JSON.parse(response.choices[0].message.content || "{}");
    });
}
// Generate diagrams for user validation
function generateValidationDiagrams(concept) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const architecturePrompt = `Create a simple architecture diagram for: ${concept.name}

Core feature: ${concept.coreFeature}
Tech stack: React frontend, Node.js backend, DynamoDB, AWS Lambda + S3

Return ONLY a Mermaid architecture diagram using this format:
\`\`\`mermaid
architecture-beta
    group frontend(logos:react)[Frontend]
        service webapp(logos:react)[${concept.name} Web App] in frontend
        
    group backend(logos:aws-lambda)[Backend]
        service api(logos:aws-lambda)[API Service] in backend
        service data(logos:aws-dynamodb)[Data Storage] in backend
        
    webapp:R --> L:api
    api:R --> L:data
\`\`\``;
        const sequencePrompt = `Create a simple sequence diagram for: ${concept.name}

User journey: ${concept.userJourney.join(' → ')}

Return ONLY a Mermaid sequence diagram showing the main user flow:
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: [describe main action]
    Frontend->>API: [api call]
    API->>Database: [data operation]
    Database-->>API: [response]
    API-->>Frontend: [result]
    Frontend-->>User: [final result]
\`\`\``;
        const componentPrompt = `Create a simple component diagram for: ${concept.name}

Features: ${concept.simpleFeatures.join(', ')}

Return ONLY a Mermaid flowchart showing main components:
\`\`\`mermaid
flowchart TB
    A[User Interface]
    B[${concept.coreFeature}]
    C[Data Management]
    D[External Services]
    
    A --> B
    B --> C
    B --> D
\`\`\``;
        try {
            const [archResponse, seqResponse, compResponse] = yield Promise.all([
                openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: architecturePrompt }],
                    temperature: 0.1,
                }),
                openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: sequencePrompt }],
                    temperature: 0.1,
                }),
                openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{ role: "user", content: componentPrompt }],
                    temperature: 0.1,
                })
            ]);
            return {
                architecture: ((_a = archResponse.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.replace(/```mermaid\n|```/g, '')) || '',
                sequence: ((_b = seqResponse.choices[0].message.content) === null || _b === void 0 ? void 0 : _b.replace(/```mermaid\n|```/g, '')) || '',
                component: ((_c = compResponse.choices[0].message.content) === null || _c === void 0 ? void 0 : _c.replace(/```mermaid\n|```/g, '')) || ''
            };
        }
        catch (error) {
            console.error('Error generating diagrams:', error);
            return {
                architecture: `architecture-beta\n    group frontend[Frontend]\n        service webapp[${concept.name}] in frontend`,
                sequence: `sequenceDiagram\n    User->>App: Use ${concept.coreFeature}\n    App-->>User: Result`,
                component: `flowchart TB\n    A[${concept.name}]\n    B[${concept.coreFeature}]`
            };
        }
    });
}
// Apply user modifications to concept
function applyUserModifications(concept, modifications) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `The user wants to modify this app concept:

Original concept: ${JSON.stringify(concept, null, 2)}

User modifications: "${modifications}"

Return the updated concept as JSON, incorporating the user's feedback while keeping it simple and focused.`;
        const response = yield openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        });
        try {
            return JSON.parse(response.choices[0].message.content || "{}");
        }
        catch (_a) {
            return concept; // Return original if parsing fails
        }
    });
}
// Generate infrastructure code (simplified)
function generateInfrastructureCode(concept) {
    return __awaiter(this, void 0, void 0, function* () {
        // Use a simplified template optimized for indie hackers
        return `
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = "us-east-1"
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Create a minimal Lambda function code file
resource "local_file" "lambda_code" {
  content = <<-EOT
const express = require('express');
const serverless = require('serverless-http');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to ${concept.name}',
    description: '${concept.description}',
    coreFeature: '${concept.coreFeature}'
  });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'healthy', app: '${concept.name}' });
});

module.exports.handler = serverless(app);
EOT
  filename = "\${path.module}/index.js"
}

# Create package.json for Lambda
resource "local_file" "package_json" {
  content = jsonencode({
    name = "${concept.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}"
    version = "1.0.0"
    main = "index.js"
    dependencies = {
      express = "^4.18.2"
      "serverless-http" = "^3.2.0"
    }
  })
  filename = "\${path.module}/package.json"
}

# Create deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "\${path.module}/lambda.zip"
  
  source {
    content  = local_file.lambda_code.content
    filename = "index.js"
  }
  
  source {
    content  = local_file.package_json.content
    filename = "package.json"
  }
  
  depends_on = [local_file.lambda_code, local_file.package_json]
}

# S3 bucket for frontend hosting
resource "aws_s3_bucket" "app_frontend" {
  bucket = "${concept.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-frontend-\${random_string.suffix.result}"
  
  tags = {
    Name = "${concept.name}Frontend"
    Environment = "Production"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "app_frontend_pab" {
  bucket = aws_s3_bucket.app_frontend.id
  
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket policy for public read access
resource "aws_s3_bucket_policy" "app_frontend_policy" {
  bucket = aws_s3_bucket.app_frontend.id
  depends_on = [aws_s3_bucket_public_access_block.app_frontend_pab]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "\${aws_s3_bucket.app_frontend.arn}/*"
      }
    ]
  })
}

# S3 bucket website configuration
resource "aws_s3_bucket_website_configuration" "app_frontend_website" {
  bucket = aws_s3_bucket.app_frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Lambda function for backend
resource "aws_lambda_function" "app_backend" {
  function_name = "${concept.name.replace(/[^a-zA-Z0-9]/g, '')}Backend-\${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 30
  memory_size   = 128
  
  tags = {
    Name = "${concept.name}Backend"
    Environment = "Production"
  }
}

# API Gateway for Lambda function
resource "aws_api_gateway_rest_api" "app_api" {
  name        = "${concept.name.replace(/[^a-zA-Z0-9]/g, '')}API-\${random_string.suffix.result}"
  description = "API for ${concept.name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway resource
resource "aws_api_gateway_resource" "app_resource" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_rest_api.app_api.root_resource_id
  path_part   = "{proxy+}"
}

# API Gateway method
resource "aws_api_gateway_method" "app_method" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.app_resource.id
  http_method   = "ANY"
  authorization = "NONE"
}

# API Gateway integration
resource "aws_api_gateway_integration" "app_integration" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  resource_id = aws_api_gateway_resource.app_resource.id
  http_method = aws_api_gateway_method.app_method.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_backend.invoke_arn
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "app_deployment" {
  depends_on = [
    aws_api_gateway_method.app_method,
    aws_api_gateway_integration.app_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.app_api.id
  stage_name  = "prod"
}

# IAM role for Lambda function
resource "aws_iam_role" "lambda_exec" {
  name = "${concept.name.replace(/[^a-zA-Z0-9]/g, '')}LambdaRole-\${random_string.suffix.result}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app_backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_api_gateway_rest_api.app_api.execution_arn}/*/*"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.app_frontend.id
}

output "s3_website_url" {
  value = "http://\${aws_s3_bucket.app_frontend.id}.s3-website-us-east-1.amazonaws.com"
}

output "api_gateway_url" {
  value = aws_api_gateway_deployment.app_deployment.invoke_url
}

output "lambda_function_name" {
  value = aws_lambda_function.app_backend.function_name
}
`;
    });
}
// Generate application code (simplified)
function generateApplicationCode(concept) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `Generate SIMPLE, working code for: ${concept.description}

Core feature: ${concept.coreFeature}

IMPORTANT: Return ONLY valid JSON, no explanatory text. Format exactly like this:
{
  "backend": {
    "index.js": "Lambda handler code using Express + serverless-http"
  },
  "package.json": "Dependencies for the backend"
}

Keep it MINIMAL - just the core feature working. Use real, runnable code.`;
        const response = yield openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are a code generator that returns ONLY valid JSON. Never include explanatory text, markdown formatting, or anything other than pure JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
        });
        try {
            const content = response.choices[0].message.content || "{}";
            // Clean any markdown formatting
            const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
            return JSON.parse(cleanContent);
        }
        catch (error) {
            console.error('Failed to parse application code JSON:', error);
            console.error('AI Response was:', response.choices[0].message.content);
            // Return minimal working code as fallback
            return {
                backend: {
                    "index.js": `
const express = require('express');
const serverless = require('serverless-http');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to ${concept.name}' });
});

module.exports.handler = serverless(app);
        `
                },
                "package.json": JSON.stringify({
                    name: concept.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    version: "1.0.0",
                    dependencies: {
                        express: "^4.18.0",
                        "serverless-http": "^3.2.0"
                    }
                }, null, 2)
            };
        }
    });
}
// Generate frontend code (simplified)
function generateFrontendCode(concept) {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `Generate a SIMPLE React frontend for: ${concept.description}

Core feature: ${concept.coreFeature}

IMPORTANT: Return ONLY valid JSON, no explanatory text. Format exactly like this:
{
  "index.html": "Single HTML file with embedded React",
  "style.css": "Simple, clean CSS"
}

Make it look GOOD but keep it SIMPLE. Single page, no routing, just the core feature.`;
        const response = yield openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are a code generator that returns ONLY valid JSON. Never include explanatory text, markdown formatting, or anything other than pure JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1,
        });
        try {
            const content = response.choices[0].message.content || "{}";
            // Clean any markdown formatting
            const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
            return JSON.parse(cleanContent);
        }
        catch (error) {
            console.error('Failed to parse frontend code JSON:', error);
            console.error('AI Response was:', response.choices[0].message.content);
            // Return minimal working frontend as fallback
            return {
                "index.html": `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${concept.name}</title>
    <link rel="stylesheet" href="style.css">
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    
    <script type="text/babel">
        function App() {
            return (
                <div className="app">
                    <h1>${concept.name}</h1>
                    <p>${concept.description}</p>
                    <div className="feature">
                        <h2>${concept.coreFeature}</h2>
                        <button>Get Started</button>
                    </div>
                </div>
            );
        }
        
        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
      `,
                "style.css": `
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.app {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
    color: white;
}

h1 { font-size: 3rem; margin-bottom: 1rem; }
h2 { font-size: 1.5rem; margin-bottom: 1rem; }
p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }

.feature {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 2rem;
    margin: 2rem 0;
}

button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover { background: #45a049; }
      `
            };
        }
    });
}
// Deploy infrastructure using existing system
function deployInfrastructure(projectId, infraCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const fetch = (yield Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        // Save infrastructure code
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace", projectId);
        if (!fs.existsSync(workspaceDir)) {
            fs.mkdirSync(workspaceDir, { recursive: true });
        }
        fs.writeFileSync(path.join(workspaceDir, "main.tf"), infraCode);
        // Call terraform service
        const response = yield fetch("http://localhost:8000/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
        });
        return yield response.json();
    });
}
// Deploy application using existing system
function deployApplication(projectId, code, infraOutputs) {
    return __awaiter(this, void 0, void 0, function* () {
        // Upload frontend files to S3
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace", projectId);
        // Write frontend files
        if (code.frontend) {
            Object.entries(code.frontend).forEach(([filename, content]) => {
                fs.writeFileSync(path.join(workspaceDir, filename), content);
            });
        }
        // Safely handle infraOutputs which might be undefined or malformed
        let appUrl = '';
        let apiUrl = '';
        let adminUrl = '';
        try {
            if (infraOutputs && typeof infraOutputs === 'object') {
                // Try to get URLs from terraform outputs
                appUrl = infraOutputs.s3_website_url ||
                    infraOutputs.website_url ||
                    (infraOutputs.s3_bucket_name ? `http://${infraOutputs.s3_bucket_name}.s3-website-us-east-1.amazonaws.com` : '');
                apiUrl = infraOutputs.api_gateway_url ||
                    infraOutputs.api_url ||
                    '';
                adminUrl = infraOutputs.lambda_function_name ?
                    `https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/${infraOutputs.lambda_function_name}` :
                    `https://console.aws.amazon.com/console/home?region=us-east-1`;
            }
            // If we still don't have URLs, try to get terraform outputs directly
            if (!appUrl || !apiUrl) {
                console.warn(`[Magic] Missing outputs, attempting to fetch terraform outputs directly for ${projectId}`);
                const outputsResult = yield getTerraformOutputs(projectId);
                if (outputsResult && outputsResult.outputs) {
                    const outputs = outputsResult.outputs;
                    appUrl = appUrl || outputs.s3_website_url || outputs.website_url || '';
                    apiUrl = apiUrl || outputs.api_gateway_url || outputs.api_url || '';
                    adminUrl = adminUrl || (outputs.lambda_function_name ?
                        `https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/${outputs.lambda_function_name}` :
                        adminUrl);
                }
            }
        }
        catch (error) {
            console.error(`[Magic] Error parsing infrastructure outputs for ${projectId}:`, error);
            console.error(`[Magic] Raw infraOutputs:`, infraOutputs);
            // Create fallback URLs based on project ID
            const timestamp = projectId.replace('magic-', '');
            appUrl = `https://console.aws.amazon.com/s3/home?region=us-east-1#/search?searchType=prefix&prefix=${projectId}`;
            apiUrl = `https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis`;
            adminUrl = `https://console.aws.amazon.com/console/home?region=us-east-1`;
        }
        return {
            appUrl,
            apiUrl,
            adminUrl,
            projectId
        };
    });
}
// Helper function to get terraform outputs directly
function getTerraformOutputs(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fetch = (yield Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
            const response = yield fetch("http://localhost:8000/outputs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.status}`);
            }
            const result = yield response.json();
            return result;
        }
        catch (error) {
            console.error(`[Magic] Failed to get terraform outputs for ${projectId}:`, error);
            return null;
        }
    });
}
// 🧹 ORPHANED RESOURCES MANAGEMENT
// List all orphaned/abandoned workspaces (expanded to handle ALL types)
const listOrphanedResources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace");
        if (!fs.existsSync(workspaceDir)) {
            res.json({ orphanedResources: [], message: "No workspace directory found" });
            return;
        }
        // Get ALL workspace directories, not just magic-* ones
        const allDirs = fs.readdirSync(workspaceDir).filter(dir => {
            const dirPath = path.join(workspaceDir, dir);
            return fs.statSync(dirPath).isDirectory() && dir !== '.DS_Store';
        });
        const orphanedResources = [];
        for (const dir of allDirs) {
            const dirPath = path.join(workspaceDir, dir);
            const stateFile = path.join(dirPath, 'terraform.tfstate');
            if (fs.existsSync(stateFile)) {
                try {
                    const stateContent = fs.readFileSync(stateFile, 'utf8');
                    const state = JSON.parse(stateContent);
                    // Check if there are actual resources in the state
                    const hasResources = state.resources && state.resources.length > 0;
                    // Get basic info about the workspace
                    const stats = fs.statSync(dirPath);
                    const createdAt = stats.mtime;
                    const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
                    // Get terraform outputs if available (only for workspaces with resources)
                    let outputs = {};
                    if (hasResources) {
                        try {
                            const outputsResult = yield getTerraformOutputs(dir);
                            outputs = (outputsResult === null || outputsResult === void 0 ? void 0 : outputsResult.outputs) || {};
                        }
                        catch (error) {
                            console.warn(`Could not get outputs for ${dir}:`, error);
                        }
                    }
                    // Count resources by type
                    const resourceCounts = {};
                    if (state.resources) {
                        state.resources.forEach((resource) => {
                            resourceCounts[resource.type] = (resourceCounts[resource.type] || 0) + 1;
                        });
                    }
                    // Determine workspace type
                    let workspaceType = 'unknown';
                    if (dir.startsWith('magic-')) {
                        workspaceType = 'magic';
                    }
                    else if (dir.startsWith('test-project-')) {
                        workspaceType = 'test';
                    }
                    else if (dir.match(/^[a-f0-9\-]{36}$/)) {
                        workspaceType = 'uuid';
                    }
                    orphanedResources.push({
                        projectId: dir,
                        workspaceType,
                        createdAt: createdAt.toISOString(),
                        ageInHours: Math.round(ageInHours * 100) / 100,
                        resourceCount: state.resources ? state.resources.length : 0,
                        resourceTypes: resourceCounts,
                        outputs,
                        stateFileSize: Math.round(stateContent.length / 1024) + 'KB',
                        status: hasResources ? 'orphaned' : 'empty_state'
                    });
                }
                catch (error) {
                    console.error(`Error reading state file for ${dir}:`, error);
                }
            }
            else {
                // Directory without state file - could be incomplete workspace
                const stats = fs.statSync(dirPath);
                const createdAt = stats.mtime;
                const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
                // Determine workspace type
                let workspaceType = 'unknown';
                if (dir.startsWith('magic-')) {
                    workspaceType = 'magic';
                }
                else if (dir.startsWith('test-project-')) {
                    workspaceType = 'test';
                }
                else if (dir.match(/^[a-f0-9\-]{36}$/)) {
                    workspaceType = 'uuid';
                }
                orphanedResources.push({
                    projectId: dir,
                    workspaceType,
                    createdAt: createdAt.toISOString(),
                    ageInHours: Math.round(ageInHours * 100) / 100,
                    resourceCount: 0,
                    resourceTypes: {},
                    outputs: {},
                    stateFileSize: '0KB',
                    status: 'no_state'
                });
            }
        }
        // Sort by age (oldest first)
        orphanedResources.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        // Separate results by type
        const resourceWorkspaces = orphanedResources.filter(r => r.resourceCount > 0);
        const emptyWorkspaces = orphanedResources.filter(r => r.resourceCount === 0 && r.status === 'empty_state');
        const noStateWorkspaces = orphanedResources.filter(r => r.status === 'no_state');
        res.json({
            orphanedResources,
            resourceWorkspaces,
            emptyWorkspaces,
            noStateWorkspaces,
            total: orphanedResources.length,
            totalWithResources: resourceWorkspaces.length,
            totalEmpty: emptyWorkspaces.length,
            totalNoState: noStateWorkspaces.length,
            message: orphanedResources.length > 0 ?
                `Found ${resourceWorkspaces.length} workspaces with AWS resources, ${emptyWorkspaces.length} empty state workspaces, and ${noStateWorkspaces.length} workspaces without state` :
                "No orphaned resources found"
        });
    }
    catch (error) {
        console.error('[Magic] Error listing orphaned resources:', error);
        res.status(500).json({
            error: 'Failed to list orphaned resources',
            details: error.message
        });
    }
});
exports.listOrphanedResources = listOrphanedResources;
// Clean up a specific orphaned workspace (updated to handle any workspace type)
const cleanupOrphanedResource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        if (!projectId) {
            res.status(400).json({ error: 'Invalid projectId. Project ID is required.' });
            return;
        }
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace", projectId);
        if (!fs.existsSync(workspaceDir)) {
            res.status(404).json({ error: 'Workspace not found' });
            return;
        }
        const stateFile = path.join(workspaceDir, 'terraform.tfstate');
        if (!fs.existsSync(stateFile)) {
            // No state file, just clean up the directory
            fs.rmSync(workspaceDir, { recursive: true, force: true });
            res.json({
                message: 'Workspace cleaned up (no Terraform state found)',
                projectId,
                action: 'directory_removed'
            });
            return;
        }
        // Check if there are actually resources to destroy
        try {
            const stateContent = fs.readFileSync(stateFile, 'utf8');
            const state = JSON.parse(stateContent);
            const hasResources = state.resources && state.resources.length > 0;
            if (!hasResources) {
                // Empty state file, just clean up the directory
                fs.rmSync(workspaceDir, { recursive: true, force: true });
                res.json({
                    message: 'Workspace cleaned up (empty Terraform state)',
                    projectId,
                    action: 'directory_removed'
                });
                return;
            }
        }
        catch (error) {
            console.error(`Error parsing state file for ${projectId}:`, error);
        }
        // Call terraform destroy
        const fetch = (yield Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const response = yield fetch("http://localhost:8000/destroy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
        });
        const result = yield response.json();
        if (result.status === 'success') {
            // Also remove the workspace directory
            fs.rmSync(workspaceDir, { recursive: true, force: true });
            res.json({
                message: 'Orphaned resources successfully cleaned up',
                projectId,
                action: 'terraform_destroyed',
                logs: result.stdout || ''
            });
        }
        else {
            res.status(500).json({
                error: 'Failed to destroy resources',
                projectId,
                details: result.stderr || result.error,
                suggestion: 'You may need to clean up resources manually in AWS Console'
            });
        }
    }
    catch (error) {
        console.error('[Magic] Error cleaning up orphaned resource:', error);
        res.status(500).json({
            error: 'Failed to cleanup orphaned resource',
            details: error.message
        });
    }
});
exports.cleanupOrphanedResource = cleanupOrphanedResource;
// Clean up all orphaned resources (dangerous - use with caution)
const cleanupAllOrphanedResources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { confirm } = req.body;
        if (confirm !== 'YES_DESTROY_ALL_ORPHANED_RESOURCES') {
            res.status(400).json({
                error: 'Missing confirmation',
                message: 'To confirm, send POST request with body: {"confirm": "YES_DESTROY_ALL_ORPHANED_RESOURCES"}'
            });
            return;
        }
        // Get list of orphaned resources
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace");
        // Get ALL workspace directories, not just magic-* ones
        const allDirs = fs.readdirSync(workspaceDir).filter(dir => {
            const dirPath = path.join(workspaceDir, dir);
            return fs.statSync(dirPath).isDirectory() && dir !== '.DS_Store';
        });
        const cleanupResults = [];
        let totalCleaned = 0;
        let totalFailed = 0;
        for (const dir of allDirs) {
            const dirPath = path.join(workspaceDir, dir);
            const stateFile = path.join(dirPath, 'terraform.tfstate');
            if (fs.existsSync(stateFile)) {
                try {
                    const stateContent = fs.readFileSync(stateFile, 'utf8');
                    const state = JSON.parse(stateContent);
                    // Check if there are actual resources in the state
                    const hasResources = state.resources && state.resources.length > 0;
                    if (hasResources) {
                        try {
                            // Call terraform destroy
                            const fetch = (yield Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
                            const response = yield fetch("http://localhost:8000/destroy", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ projectId: dir }),
                            });
                            const result = yield response.json();
                            if (result.status === 'success') {
                                // Remove the workspace directory
                                fs.rmSync(dirPath, { recursive: true, force: true });
                                cleanupResults.push({
                                    projectId: dir,
                                    status: 'success',
                                    message: 'Resources destroyed and workspace cleaned up'
                                });
                                totalCleaned++;
                            }
                            else {
                                cleanupResults.push({
                                    projectId: dir,
                                    status: 'failed',
                                    error: result.stderr || result.error
                                });
                                totalFailed++;
                            }
                        }
                        catch (error) {
                            cleanupResults.push({
                                projectId: dir,
                                status: 'failed',
                                error: error.message
                            });
                            totalFailed++;
                        }
                    }
                    else {
                        // Empty state file, just remove the directory
                        try {
                            fs.rmSync(dirPath, { recursive: true, force: true });
                            cleanupResults.push({
                                projectId: dir,
                                status: 'success',
                                message: 'Empty workspace directory removed'
                            });
                            totalCleaned++;
                        }
                        catch (error) {
                            cleanupResults.push({
                                projectId: dir,
                                status: 'failed',
                                error: error.message
                            });
                            totalFailed++;
                        }
                    }
                }
                catch (error) {
                    console.error(`Error processing ${dir}:`, error);
                    cleanupResults.push({
                        projectId: dir,
                        status: 'failed',
                        error: `Failed to parse state file: ${error}`
                    });
                    totalFailed++;
                }
            }
            else {
                // No state file, just remove the directory
                try {
                    fs.rmSync(dirPath, { recursive: true, force: true });
                    cleanupResults.push({
                        projectId: dir,
                        status: 'success',
                        message: 'Directory without state removed'
                    });
                    totalCleaned++;
                }
                catch (error) {
                    cleanupResults.push({
                        projectId: dir,
                        status: 'failed',
                        error: error.message
                    });
                    totalFailed++;
                }
            }
        }
        res.json({
            message: `Cleanup completed: ${totalCleaned} successful, ${totalFailed} failed`,
            totalCleaned,
            totalFailed,
            results: cleanupResults
        });
    }
    catch (error) {
        console.error('[Magic] Error in bulk cleanup:', error);
        res.status(500).json({
            error: 'Failed to cleanup orphaned resources',
            details: error.message
        });
    }
});
exports.cleanupAllOrphanedResources = cleanupAllOrphanedResources;
// Get detailed information about a specific workspace (updated to handle any workspace type)
const getWorkspaceDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        if (!projectId) {
            res.status(400).json({ error: 'Invalid projectId. Project ID is required.' });
            return;
        }
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace", projectId);
        if (!fs.existsSync(workspaceDir)) {
            res.status(404).json({ error: 'Workspace not found' });
            return;
        }
        // Determine workspace type
        let workspaceType = 'unknown';
        if (projectId.startsWith('magic-')) {
            workspaceType = 'magic';
        }
        else if (projectId.startsWith('test-project-')) {
            workspaceType = 'test';
        }
        else if (projectId.match(/^[a-f0-9\-]{36}$/)) {
            workspaceType = 'uuid';
        }
        const stateFile = path.join(workspaceDir, 'terraform.tfstate');
        let stateInfo = null;
        if (fs.existsSync(stateFile)) {
            try {
                const stateContent = fs.readFileSync(stateFile, 'utf8');
                const state = JSON.parse(stateContent);
                stateInfo = {
                    hasResources: state.resources && state.resources.length > 0,
                    resourceCount: state.resources ? state.resources.length : 0,
                    resources: state.resources ? state.resources.map((r) => ({
                        type: r.type,
                        name: r.name,
                        provider: r.provider
                    })) : []
                };
            }
            catch (error) {
                stateInfo = { error: 'Failed to parse state file' };
            }
        }
        // Get file list
        const files = fs.readdirSync(workspaceDir).map(file => {
            const filePath = path.join(workspaceDir, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                isDirectory: stats.isDirectory(),
                modified: stats.mtime.toISOString()
            };
        });
        // Get terraform outputs if available
        let outputs = {};
        try {
            const outputsResult = yield getTerraformOutputs(projectId);
            outputs = (outputsResult === null || outputsResult === void 0 ? void 0 : outputsResult.outputs) || {};
        }
        catch (error) {
            console.warn(`Could not get outputs for ${projectId}:`, error);
        }
        res.json({
            projectId,
            workspaceType,
            workspaceDir,
            stateInfo,
            outputs,
            files,
            actions: {
                cleanup: `/api/magic/cleanup/${projectId}`,
                manualCleanup: `cd ${workspaceDir} && terraform destroy -auto-approve`
            }
        });
    }
    catch (error) {
        console.error('[Magic] Error getting workspace details:', error);
        res.status(500).json({
            error: 'Failed to get workspace details',
            details: error.message
        });
    }
});
exports.getWorkspaceDetails = getWorkspaceDetails;
// 📊 COMPREHENSIVE RESOURCE MANAGEMENT API
// Get comprehensive resource status for all workspaces with cost and deployment info
const getResourcesOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fs = yield Promise.resolve().then(() => __importStar(require('fs')));
        const path = yield Promise.resolve().then(() => __importStar(require('path')));
        const workspaceDir = path.join(__dirname, "../../terraform-runner/workspace");
        if (!fs.existsSync(workspaceDir)) {
            res.json({
                resources: [],
                summary: {
                    total: 0,
                    active: 0,
                    provisioned: 0,
                    deploymentFailed: 0,
                    orphaned: 0,
                    incomplete: 0
                },
                costEstimate: {
                    monthly: 0,
                    breakdown: {}
                }
            });
            return;
        }
        // Get all workspace directories
        const allDirs = fs.readdirSync(workspaceDir).filter(dir => {
            const dirPath = path.join(workspaceDir, dir);
            return fs.statSync(dirPath).isDirectory() && dir !== '.DS_Store';
        });
        const resources = [];
        let totalMonthlyCost = 0;
        const costBreakdown = {};
        for (const dir of allDirs) {
            const dirPath = path.join(workspaceDir, dir);
            const stateFile = path.join(dirPath, 'terraform.tfstate');
            const stats = fs.statSync(dirPath);
            // Determine workspace type
            let workspaceType = 'unknown';
            let source = 'unknown';
            if (dir.startsWith('magic-')) {
                workspaceType = 'magic';
                source = 'Magic App Builder';
            }
            else if (dir.startsWith('test-project-')) {
                workspaceType = 'test';
                source = 'Test Project';
            }
            else if (dir.match(/^[a-f0-9\-]{36}$/)) {
                workspaceType = 'uuid';
                source = 'General Project';
            }
            let deploymentStatus = 'incomplete';
            let resourceCount = 0;
            let resourceTypes = {};
            let terraformOutputs = {};
            let hasLiveResources = false;
            let estimatedMonthlyCost = 0;
            // Analyze terraform state if exists
            if (fs.existsSync(stateFile)) {
                try {
                    const stateContent = fs.readFileSync(stateFile, 'utf8');
                    const state = JSON.parse(stateContent);
                    if (state.resources && state.resources.length > 0) {
                        hasLiveResources = true;
                        resourceCount = state.resources.length;
                        // Count resources by type and estimate costs
                        state.resources.forEach((resource) => {
                            resourceTypes[resource.type] = (resourceTypes[resource.type] || 0) + 1;
                            // Estimate costs based on resource type
                            const resourceCost = estimateResourceCost(resource.type);
                            estimatedMonthlyCost += resourceCost;
                        });
                        // Try to get terraform outputs to determine deployment success
                        try {
                            const outputsResult = yield getTerraformOutputs(dir);
                            terraformOutputs = (outputsResult === null || outputsResult === void 0 ? void 0 : outputsResult.outputs) || {};
                            // Check if we have expected outputs (indicates successful deployment)
                            const hasWebsiteUrl = terraformOutputs.s3_website_url || terraformOutputs.website_url;
                            const hasApiUrl = terraformOutputs.api_gateway_url || terraformOutputs.api_url;
                            if (hasWebsiteUrl || hasApiUrl) {
                                deploymentStatus = 'active';
                            }
                            else {
                                deploymentStatus = 'provisioned_no_app'; // Resources exist but no app deployed
                            }
                        }
                        catch (error) {
                            deploymentStatus = 'provisioned_no_app';
                        }
                        // Check if this is a failed Magic App Builder deployment
                        if (workspaceType === 'magic' && deploymentStatus === 'provisioned_no_app') {
                            deploymentStatus = 'deployment_failed';
                        }
                    }
                    else {
                        deploymentStatus = 'empty_state';
                    }
                }
                catch (error) {
                    deploymentStatus = 'corrupted_state';
                }
            }
            else {
                deploymentStatus = 'incomplete';
            }
            // Calculate age
            const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
            const ageInDays = Math.floor(ageInHours / 24);
            // Add to cost breakdown
            if (estimatedMonthlyCost > 0) {
                costBreakdown[source] = (costBreakdown[source] || 0) + estimatedMonthlyCost;
                totalMonthlyCost += estimatedMonthlyCost;
            }
            resources.push({
                projectId: dir,
                workspaceType,
                source,
                deploymentStatus,
                resourceCount,
                resourceTypes,
                outputs: terraformOutputs,
                hasLiveResources,
                estimatedMonthlyCost,
                createdAt: stats.mtime.toISOString(),
                ageInHours: Math.round(ageInHours * 100) / 100,
                ageInDays,
                workspaceDir: dirPath,
                actions: {
                    details: `/api/magic/workspace/${dir}`,
                    cleanup: `/api/magic/cleanup/${dir}`,
                    console: hasLiveResources ?
                        `https://console.aws.amazon.com/console/home?region=us-east-1` :
                        null
                }
            });
        }
        // Sort by creation date (newest first)
        resources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Generate summary
        const summary = {
            total: resources.length,
            active: resources.filter(r => r.deploymentStatus === 'active').length,
            provisioned: resources.filter(r => r.hasLiveResources).length,
            deploymentFailed: resources.filter(r => r.deploymentStatus === 'deployment_failed').length,
            orphaned: resources.filter(r => r.deploymentStatus === 'provisioned_no_app').length,
            incomplete: resources.filter(r => !r.hasLiveResources).length
        };
        res.json({
            resources,
            summary,
            costEstimate: {
                monthly: Math.round(totalMonthlyCost * 100) / 100,
                breakdown: costBreakdown
            },
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Resource Management] Error getting resources overview:', error);
        res.status(500).json({
            error: 'Failed to get resources overview',
            details: error.message
        });
    }
});
exports.getResourcesOverview = getResourcesOverview;
// Helper function to estimate monthly cost based on resource type
function estimateResourceCost(resourceType) {
    const costEstimates = {
        'aws_lambda_function': 5, // ~$5/month for minimal usage
        'aws_s3_bucket': 10, // ~$10/month for small website
        'aws_api_gateway_rest_api': 5, // ~$5/month for minimal usage
        'aws_dynamodb_table': 25, // ~$25/month for small table
        'aws_iam_role': 0, // Free
        'aws_iam_policy': 0, // Free
        'aws_iam_role_policy_attachment': 0, // Free
        'aws_api_gateway_deployment': 0, // Covered by API Gateway
        'aws_api_gateway_resource': 0, // Covered by API Gateway
        'aws_api_gateway_method': 0, // Covered by API Gateway
        'aws_api_gateway_integration': 0, // Covered by API Gateway
        'aws_lambda_permission': 0, // Free
        'aws_s3_bucket_policy': 0, // Free
        'aws_s3_bucket_website_configuration': 0, // Free
        'aws_s3_bucket_public_access_block': 0, // Free
        'random_string': 0, // Free (Terraform resource)
        'local_file': 0, // Free (Terraform resource)
        'archive_file': 0, // Free (Terraform resource)
        'data.archive_file': 0 // Free (Terraform resource)
    };
    return costEstimates[resourceType] || 5; // Default $5/month for unknown resources
}
// Get resource status by category for dashboard
const getResourcesByCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.params;
        // Get full overview first
        const overviewReq = Object.assign({}, req);
        const overviewRes = {
            json: (data) => data,
            status: (code) => ({ json: (data) => data })
        };
        // Mock the response object to capture data
        let overviewData = null;
        overviewRes.json = (data) => {
            overviewData = data;
            return data;
        };
        yield (0, exports.getResourcesOverview)(overviewReq, overviewRes);
        if (!overviewData) {
            res.status(500).json({ error: 'Failed to get resources data' });
            return;
        }
        // Filter by category
        let filteredResources = overviewData.resources;
        switch (category) {
            case 'active':
                filteredResources = overviewData.resources.filter((r) => r.deploymentStatus === 'active');
                break;
            case 'provisioned':
                filteredResources = overviewData.resources.filter((r) => r.hasLiveResources);
                break;
            case 'failed':
                filteredResources = overviewData.resources.filter((r) => r.deploymentStatus === 'deployment_failed');
                break;
            case 'orphaned':
                filteredResources = overviewData.resources.filter((r) => r.deploymentStatus === 'provisioned_no_app');
                break;
            case 'incomplete':
                filteredResources = overviewData.resources.filter((r) => !r.hasLiveResources);
                break;
            case 'costly':
                filteredResources = overviewData.resources.filter((r) => r.estimatedMonthlyCost > 0);
                break;
            default:
                filteredResources = overviewData.resources;
        }
        res.json({
            category,
            resources: filteredResources,
            count: filteredResources.length,
            totalCost: filteredResources.reduce((sum, r) => sum + r.estimatedMonthlyCost, 0)
        });
    }
    catch (error) {
        console.error('[Resource Management] Error getting resources by category:', error);
        res.status(500).json({
            error: 'Failed to get resources by category',
            details: error.message
        });
    }
});
exports.getResourcesByCategory = getResourcesByCategory;
