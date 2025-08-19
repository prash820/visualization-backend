import { Request, Response } from "express";
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import { databaseService, Job } from '../services/databaseService';

interface ArchitectureOption {
  id: string;
  name: string;
  description: string;
  architecture: string;
  estimatedCost: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  costBreakdown?: {
    compute: number;
    storage: number;
    database: number;
    networking: number;
    monitoring: number;
    other: number;
  };
  pros: string[];
  cons: string[];
  bestFor: string;
  complexity: 'low' | 'medium' | 'high';
  scalability: 'low' | 'medium' | 'high';
  security: 'low' | 'medium' | 'high';
  performance: 'low' | 'medium' | 'high';
  infrastructureCode?: string;
  deploymentSteps?: string[];
  estimatedDeploymentTime?: string;
  maintenanceEffort?: 'low' | 'medium' | 'high';
  disasterRecovery?: string;
  compliance?: string[];
}

interface ArchitectureRecommendationJob extends Job {
  userPrompt?: string;
  architectureOptions?: ArchitectureOption[];
  selectedOption?: string;
  recommendationReasoning?: string;
}

function generateJobId() {
  return `arch-rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate Smart Cloud Architect recommendations
 */
export const generateArchitectureRecommendations = async (req: Request, res: Response): Promise<void> => {
  const { prompt, projectId, userId } = req.body;
  
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }
  
  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job: ArchitectureRecommendationJob = {
    id: jobId,
    type: 'architecture',
    status: "pending",
    progress: 0,
    phase: "analyzing",
    prompt,
    projectId: projectId || `project-${Date.now()}`,
    userId: userId || 'anonymous',
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };
  
  databaseService.saveJob(job);
  
  // Start background processing
  processArchitectureRecommendation(jobId, prompt, projectId || `project-${Date.now()}`);
  
  res.json({ 
    jobId, 
    status: "accepted", 
    message: "Architecture analysis started" 
  });
};

/**
 * Get architecture recommendation job status
 */
export const getArchitectureRecommendationJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  const job = databaseService.getJob(jobId);
  
  if (!jobId || !job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  
  // Map Job to ArchitectureRecommendationJob and extract architecture options from result
  const result = job.result as any;
  const architectureRecommendationJob: ArchitectureRecommendationJob = {
    ...job,
    userPrompt: result && result.userPrompt,
    architectureOptions: result && result.architectureOptions,
    selectedOption: result && result.selectedOption,
    recommendationReasoning: result && result.recommendationReasoning
  };
  
  // Update last accessed time
  architectureRecommendationJob.lastAccessed = new Date().toISOString();
  databaseService.saveJob(architectureRecommendationJob);
  
  res.json(architectureRecommendationJob);
};

/**
 * Get all architecture recommendation jobs
 */
export const getAllArchitectureRecommendationJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = databaseService.getAllJobs('architecture');
    
    // Map Job objects to ArchitectureRecommendationJob objects
    const architectureRecommendationJobs: ArchitectureRecommendationJob[] = jobs.map(job => {
      const result = job.result as any;
      return {
        ...job,
        userPrompt: result && result.userPrompt,
        architectureOptions: result && result.architectureOptions,
        selectedOption: result && result.selectedOption,
        recommendationReasoning: result && result.recommendationReasoning
      };
    });
    
    res.json({ jobs: architectureRecommendationJobs });
  } catch (error) {
    console.error('Error getting architecture jobs:', error);
    res.status(500).json({ error: "Failed to get architecture jobs" });
  }
};

/**
 * Select architecture option
 */
export const selectArchitectureOption = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;
  const { selectedOptionId } = req.body;

  if (!selectedOptionId) {
    res.status(400).json({ error: "Selected option ID is required" });
    return;
  }

  const job = databaseService.getJob(jobId) as ArchitectureRecommendationJob;
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const result = job.result as any;
  const architectureOptions = result?.architectureOptions || [];
  const selectedOption = architectureOptions.find((opt: ArchitectureOption) => opt.id === selectedOptionId);

  if (!selectedOption) {
    res.status(400).json({ error: "Invalid option ID" });
    return;
  }

  // Update job with selected option
  job.selectedOption = selectedOptionId;
  job.status = "option-selected";
  job.updatedAt = new Date().toISOString();
  job.lastAccessed = new Date().toISOString();

  // Update result field
  const updatedResult = {
    ...result,
    selectedOption: selectedOptionId
  };
  job.result = JSON.stringify(updatedResult);

  databaseService.saveJob(job);

  res.json({ 
    success: true, 
    selectedOption,
    message: "Architecture option selected successfully" 
  });
};

async function processArchitectureRecommendation(jobId: string, prompt: string, projectId: string) {
  try {
    const now = new Date().toISOString();
    let job = databaseService.getJob(jobId) as ArchitectureRecommendationJob;
    
    if (job) {
      job.status = "processing";
      job.progress = 20;
      job.phase = "analyzing-requirements";
      job.updatedAt = now;
      job.lastAccessed = now;
      databaseService.saveJob(job);
    }

    // Generate architecture options
    const architectureOptions = await generateArchitectureOptions(prompt);

    if (job) {
      job.progress = 60;
      job.phase = "generating-options";
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();
      databaseService.saveJob(job);
    }

    // Generate recommendation reasoning
    const recommendationReasoning = await generateRecommendationReasoning(prompt, architectureOptions);

    if (job) {
      job.status = "completed";
      job.progress = 100;
      job.phase = "completed";
      job.architectureOptions = architectureOptions;
      job.recommendationReasoning = recommendationReasoning;
      job.updatedAt = new Date().toISOString();
      job.lastAccessed = new Date().toISOString();

      // Store in result field
      job.result = JSON.stringify({
        userPrompt: prompt,
        architectureOptions,
        recommendationReasoning
      });

      databaseService.saveJob(job);
    }

  } catch (error) {
    console.error('Error processing architecture recommendation:', error);
    handleArchitectureError(jobId, error);
  }
}

async function generateArchitectureOptions(prompt: string): Promise<ArchitectureOption[]> {
  const systemPrompt = `You are a Senior Cloud Solutions Architect with expertise in AWS, Azure, and GCP. Your task is to analyze a user's application idea and provide 3 different architecture options with comprehensive details including cost analysis, infrastructure code, and deployment information.

For each option, provide:
1. A descriptive name
2. Detailed description of the architecture
3. Estimated monthly and yearly costs (in USD) with cost breakdown
4. Pros and cons
5. Best use cases
6. Complexity, scalability, security, and performance ratings
7. Infrastructure code (Terraform or CloudFormation)
8. Deployment steps
9. Estimated deployment time
10. Maintenance effort
11. Disaster recovery strategy
12. Compliance considerations

Generate 3 distinct options:
1. **Cost-Optimized**: Focus on minimizing costs while maintaining basic functionality
2. **Performance-Optimized**: Focus on high performance and scalability
3. **Balanced**: Good balance between cost, performance, and maintainability

User Requirements: ${prompt}

Return a JSON array with exactly 3 architecture options. Each option should have this structure:
{
  "id": "unique-id",
  "name": "Option Name",
  "description": "Detailed description",
  "architecture": "Technical architecture details",
  "estimatedCost": {
    "monthly": 150,
    "yearly": 1800,
    "currency": "USD"
  },
  "costBreakdown": {
    "compute": 80,
    "storage": 20,
    "database": 30,
    "networking": 10,
    "monitoring": 5,
    "other": 5
  },
  "pros": ["pro1", "pro2", "pro3"],
  "cons": ["con1", "con2", "con3"],
  "bestFor": "Description of best use cases",
  "complexity": "low|medium|high",
  "scalability": "low|medium|high",
  "security": "low|medium|high",
  "performance": "low|medium|high",
  "infrastructureCode": "provider \"aws\" {\n  region = \"us-east-1\"\n}\n\n# Use nodejs18.x runtime for Lambda functions\n# Use aws_s3_bucket_ownership_controls resource for S3 buckets (not ACLs)\n# Do NOT use Terraform variables (var blocks) - use hardcoded values\n# Your Terraform resources here...",
  "deploymentSteps": ["Step 1", "Step 2", "Step 3"],
  "estimatedDeploymentTime": "2-4 hours",
  "maintenanceEffort": "low|medium|high",
  "disasterRecovery": "Description of disaster recovery strategy",
  "compliance": ["SOC 2", "GDPR", "HIPAA"]
}

Ensure all cost estimates are realistic and based on current AWS pricing. The infrastructure code should be valid Terraform or CloudFormation that can be deployed.

**CRITICAL FOR INFRASTRUCTURE CODE:**
- Do NOT use Terraform variables (var blocks) - use hardcoded values instead
- Do NOT require external input variables - everything should be self-contained
- Use unique bucket names with project ID or timestamp (e.g., "my-app-bucket-1234567890")
- Use nodejs18.x runtime for Lambda functions (nodejs20.x is not supported)
- Use aws_s3_bucket_ownership_controls resource for S3 buckets (not ACLs)`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: "user", content: systemPrompt }]
    });
    console.log(`[Smart Architect] OpenAI request successful`);
  } catch (openaiError) {
    console.log(`[Smart Architect] OpenAI failed, trying Anthropic:`, openaiError);
    response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: "user", content: systemPrompt }]
    });
    console.log(`[Smart Architect] Anthropic fallback successful`);
  }

  let content: string;
  if ('choices' in response) {
    content = response.choices[0]?.message?.content || "";
  } else {
    content = response.content[0]?.type === 'text' ? response.content[0].text : "";
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  const architectureOptions: ArchitectureOption[] = JSON.parse(jsonMatch[0]);
  return architectureOptions;
}

async function generateRecommendationReasoning(prompt: string, options: ArchitectureOption[]): Promise<string> {
  const systemPrompt = `You are a Cloud Solutions Architect providing expert advice. Based on the user's requirements and the 3 architecture options provided, give a brief recommendation reasoning.

User Requirements: ${prompt}

Architecture Options:
${options.map((opt, index) => `${index + 1}. ${opt.name}: ${opt.description}`).join('\n')}

Provide a concise recommendation reasoning (2-3 sentences) explaining which option might be best suited for the user's needs and why.`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: "user", content: systemPrompt }]
    });
  } catch (openaiError) {
    response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: "user", content: systemPrompt }]
    });
  }

  let content: string;
  if ('choices' in response) {
    content = response.choices[0]?.message?.content || "";
  } else {
    content = response.content[0]?.type === 'text' ? response.content[0].text : "";
  }

  return content.trim();
}

function handleArchitectureError(jobId: string, error: any) {
  const now = new Date().toISOString();
  const job = databaseService.getJob(jobId) as ArchitectureRecommendationJob;
  if (job) {
    job.status = "failed";
    job.progress = 100;
    job.error = error.message || "Unknown error";
    job.updatedAt = now;
    job.lastAccessed = now;
    databaseService.saveJob(job);
  }
} 