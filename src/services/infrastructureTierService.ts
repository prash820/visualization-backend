// src/services/infrastructureTierService.ts
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import { dynamicPricingService } from './dynamicPricingService';

export interface InfrastructureTier {
  name: string;
  description: string;
  terraformCode?: string; // Optional - only generated after selection
  architectureDiagram?: string; // Optional - only generated after selection
  costBreakdown: CostBreakdown;
  maintenanceLevel: 'high' | 'medium' | 'low';
  estimatedMonthlyCost: number;
  pros: string[];
  cons: string[];
  isDetailed?: boolean; // Flag to indicate if detailed code has been generated
  
  // Auto-scaling and performance capabilities
  performanceProfile: PerformanceProfile;
  autoScalingPlan: AutoScalingPlan;
  scalingTiers: ScalingTier[];
}

export interface PerformanceProfile {
  concurrentUsers: {
    baseline: number; // Users at normal load
    peak: number; // Users at peak load
    burst: number; // Users during traffic spikes
  };
  responseTime: {
    p50: string; // 50th percentile
    p95: string; // 95th percentile
    p99: string; // 99th percentile
  };
  throughput: {
    requestsPerSecond: number;
    dataTransferGB: number;
  };
  availability: string; // e.g., "99.9%"
}

export interface AutoScalingPlan {
  enabled: boolean;
  scalingPolicy: 'horizontal' | 'vertical' | 'hybrid';
  triggers: ScalingTrigger[];
  limits: {
    minInstances: number;
    maxInstances: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
  };
  cooldownPeriod: number; // seconds
  estimatedCostImpact: string; // e.g., "+$50-200/month"
}

export interface ScalingTrigger {
  type: 'cpu' | 'memory' | 'requests' | 'custom';
  threshold: number;
  action: 'scale_up' | 'scale_down';
  description: string;
}

export interface ScalingTier {
  name: string; // e.g., "Basic", "Standard", "Enterprise"
  concurrentUsers: number;
  monthlyCost: number;
  features: string[];
  autoScaling: boolean;
  estimatedTraffic: {
    dailyRequests: number;
    peakRequestsPerSecond: number;
  };
}

export interface CostBreakdown {
  resources: ResourceCost[];
  totalMonthlyCost: number;
  costNotes: string[];
}

export interface ResourceCost {
  service: string;
  resource: string;
  estimatedMonthlyCost: number;
  costCalculation: string;
  notes: string;
}

export interface InfrastructureOptions {
  lowCost: InfrastructureTier;
  mediumCost: InfrastructureTier;
  highCost: InfrastructureTier;
}

// Get real-time pricing using dynamic pricing service
async function getRealTimePricing(region: string = 'us-east-1') {
  try {
    console.log(`[Infrastructure Tiers] Getting dynamic pricing for region: ${region}`);
    
    // Get pricing for common services using dynamic pricing service
    const pricing = {
      EC2: {
        t3_micro: await dynamicPricingService.calculateServiceCost('ec2', 't3.micro', region),
        t3_small: await dynamicPricingService.calculateServiceCost('ec2', 't3.small', region),
        t3_medium: await dynamicPricingService.calculateServiceCost('ec2', 't3.medium', region),
        m5_large: await dynamicPricingService.calculateServiceCost('ec2', 'm5.large', region)
      },
      S3: {
        low: await dynamicPricingService.calculateServiceCost('s3', 'low', region),
        medium: await dynamicPricingService.calculateServiceCost('s3', 'medium', region),
        high: await dynamicPricingService.calculateServiceCost('s3', 'high', region)
      },
      Lambda: {
        low: await dynamicPricingService.calculateServiceCost('lambda', 'low', region),
        medium: await dynamicPricingService.calculateServiceCost('lambda', 'medium', region),
        high: await dynamicPricingService.calculateServiceCost('lambda', 'high', region)
      },
      CloudFront: {
        low: await dynamicPricingService.calculateServiceCost('cloudfront', 'low', region),
        medium: await dynamicPricingService.calculateServiceCost('cloudfront', 'medium', region),
        high: await dynamicPricingService.calculateServiceCost('cloudfront', 'high', region)
      },
      ElastiCache: {
        small: await dynamicPricingService.calculateServiceCost('elasticache', 'cache.t3.micro', region),
        medium: await dynamicPricingService.calculateServiceCost('elasticache', 'cache.t3.small', region),
        large: await dynamicPricingService.calculateServiceCost('elasticache', 'cache.m5.large', region)
      },
      WAF: {
        low: await dynamicPricingService.calculateServiceCost('waf', 'low', region),
        medium: await dynamicPricingService.calculateServiceCost('waf', 'medium', region),
        high: await dynamicPricingService.calculateServiceCost('waf', 'high', region)
      }
    };

    return {
      ...pricing,
      cacheStatus: dynamicPricingService.getCacheStatus(),
      onDemandCapability: true,
      note: "Using dynamic pricing service with real-time AWS pricing"
    };
  } catch (error) {
    console.error('[Infrastructure Tiers] Failed to get dynamic pricing, falling back to static pricing:', error);
    return {
      ...AWS_COST_REFERENCE,
      cacheStatus: { totalServices: 0, validEntries: 0, expiredEntries: 0 },
      onDemandCapability: false,
      note: "Using static pricing - dynamic pricing service unavailable"
    };
  }
}

// AWS Cost Reference Data (2024 prices, simplified) - Fallback
const AWS_COST_REFERENCE = {
  // S3
  s3_storage: { cost: 0.023, unit: 'per GB per month' },
  s3_requests: { cost: 0.0004, unit: 'per 1,000 GET requests' },
  
  // Lambda
  lambda_requests: { cost: 0.20, unit: 'per 1M requests' },
  lambda_duration: { cost: 0.0000166667, unit: 'per GB-second' },
  
  // API Gateway
  api_gateway_requests: { cost: 3.50, unit: 'per 1M requests' },
  api_gateway_data: { cost: 0.09, unit: 'per GB' },
  
  // DynamoDB
  dynamodb_storage: { cost: 0.25, unit: 'per GB per month' },
  dynamodb_requests: { cost: 1.25, unit: 'per 1M read requests' },
  dynamodb_writes: { cost: 6.25, unit: 'per 1M write requests' },
  
  // EC2 (t3.micro)
  ec2_t3_micro: { cost: 8.47, unit: 'per month' },
  ec2_t3_small: { cost: 16.94, unit: 'per month' },
  ec2_t3_medium: { cost: 33.88, unit: 'per month' },
  
  // RDS
  rds_mysql_t3_micro: { cost: 12.41, unit: 'per month' },
  rds_mysql_t3_small: { cost: 24.82, unit: 'per month' },
  
  // CloudFront
  cloudfront_requests: { cost: 0.0075, unit: 'per 10,000 requests' },
  cloudfront_data: { cost: 0.085, unit: 'per GB' },
  
  // Route 53
  route53_hosted_zone: { cost: 0.50, unit: 'per month' },
  route53_queries: { cost: 0.40, unit: 'per 1M queries' },
  
  // ElastiCache
  elasticache_t3_micro: { cost: 15.00, unit: 'per month' },
  elasticache_t3_small: { cost: 30.00, unit: 'per month' },
  elasticache_m5_large: { cost: 150.00, unit: 'per month' },
  
  // WAF
  waf_requests: { cost: 0.60, unit: 'per 1M requests' },
  waf_base: { cost: 5.00, unit: 'per month' }
};

export const generateInfrastructureTiers = async (prompt: string, region: string = 'us-east-1'): Promise<InfrastructureOptions> => {
  try {
    console.log(`[Infrastructure Tiers] Generating three infrastructure tier options for region: ${region}`);
    
    // Get real-time pricing data for the specified region
    const realTimePricing = await getRealTimePricing(region);
    
    const systemPrompt = `You are an expert AWS cloud architect specializing in cost-optimized infrastructure design with auto-scaling capabilities. 

Your task is to create THREE different infrastructure tier OPTIONS for the given application. 
ONLY provide high-level descriptions, cost estimates, and performance profiles. DO NOT generate Terraform code or detailed architecture diagrams yet.

USER REQUIREMENTS: "${prompt}"

1. **LOW COST, HIGH MAINTENANCE** (Budget-friendly, requires more manual management)
2. **MEDIUM COST, MEDIUM MAINTENANCE** (Balanced approach)
3. **HIGH COST, LOW MAINTENANCE** (Premium, fully managed services)

For each tier, provide:
- High-level description of the approach
- Estimated monthly cost breakdown
- Performance profile (concurrent users, response times, throughput)
- Auto-scaling plan and capabilities
- Multiple scaling tiers with different user capacities
- Pros and cons of the approach
- Maintenance level requirements

CRITICAL REQUIREMENTS:
- Use REAL-TIME AWS pricing (updated ${new Date().toISOString()})
- Include concurrent user capacity for each tier
- Provide auto-scaling plans for traffic surges
- Show range-based pricing for different scaling levels
- Consider performance benchmarks and response times
- **ARCHITECTURE SELECTION BASED ON USER REQUIREMENTS:**
  - If user mentions "EC2", "ec2", "instance", "server", "VM": Use EC2-based architecture for low-cost tier
  - If user mentions "serverless", "lambda", "function": Use serverless architecture for low-cost tier
  - If no specific compute mentioned: Default to serverless for low-cost tier
- **FOR EC2-BASED LOW-COST TIER:** Use EC2 instances + Application Load Balancer + S3 + DynamoDB
- **FOR SERVERLESS LOW-COST TIER:** Use Lambda + API Gateway + S3 + DynamoDB
- **MUST include appropriate caching layers** when user requests caching:
  - For low-cost: Use CloudFront CDN for static content caching
  - For medium-cost: Add ElastiCache Redis for application caching + CloudFront
  - For high-cost: Enterprise ElastiCache Redis cluster + CloudFront + Application Load Balancer caching
- **MUST include network security** when user requests security:
  - For low-cost: Security groups, basic WAF rules
  - For medium-cost: Enhanced security groups, WAF, VPC with private subnets
  - For high-cost: Advanced WAF, VPC with multiple AZs, security groups, IAM roles
- DO NOT generate Terraform code or detailed diagrams

PERFORMANCE GUIDELINES:
- Low Cost: 100-1,000 concurrent users, basic auto-scaling
- Medium Cost: 1,000-10,000 concurrent users, advanced auto-scaling
- High Cost: 10,000+ concurrent users, enterprise auto-scaling

REAL-TIME AWS PRICING (Updated ${new Date().toISOString()}):
${JSON.stringify(realTimePricing, null, 2)}

Return the response in this exact JSON format:
{
  "lowCost": {
    "name": "Budget-Friendly EC2-Based with Caching & Security",
    "description": "Minimal cost using EC2 instances with CloudFront caching and WAF security",
    "costBreakdown": {
      "resources": [
        {
          "service": "EC2",
          "resource": "t3.micro Instance",
          "estimatedMonthlyCost": 8.47,
          "costCalculation": "1 instance × $8.47 per month",
          "notes": "Free tier eligible (750 hours)"
        },
        {
          "service": "S3",
          "resource": "Static File Hosting",
          "estimatedMonthlyCost": 0.50,
          "costCalculation": "1GB storage × $0.023 + 10K requests × $0.0004",
          "notes": "Free tier eligible"
        },
        {
          "service": "DynamoDB",
          "resource": "NoSQL Database",
          "estimatedMonthlyCost": 2.50,
          "costCalculation": "1GB storage × $0.25 + 1M read requests × $1.25",
          "notes": "Free tier eligible"
        },
        {
          "service": "Application Load Balancer",
          "resource": "Load Balancer",
          "estimatedMonthlyCost": 16.20,
          "costCalculation": "16 hours × $1.0125 per hour",
          "notes": "Basic load balancing"
        },
        {
          "service": "CloudFront",
          "resource": "CDN Caching",
          "estimatedMonthlyCost": 0.50,
          "costCalculation": "10GB data transfer × $0.085 per GB",
          "notes": "Free tier eligible"
        },
        {
          "service": "WAF",
          "resource": "Basic Security",
          "estimatedMonthlyCost": 0.50,
          "costCalculation": "1 rule × $0.60 per rule",
          "notes": "Basic network security"
        }
      ],
      "totalMonthlyCost": 28.67,
      "costNotes": ["Uses AWS free tier", "EC2-based architecture", "Includes caching and security"]
    },
    "maintenanceLevel": "high",
    "estimatedMonthlyCost": 28.67,
    "pros": ["EC2 control", "Predictable costs", "CloudFront caching", "WAF security", "Basic auto-scaling"],
    "cons": ["Manual monitoring", "Server management", "Higher cost than serverless"],
    "performanceProfile": {
      "concurrentUsers": {
        "baseline": 100,
        "peak": 500,
        "burst": 1000
      },
      "responseTime": {
        "p50": "200ms",
        "p95": "500ms",
        "p99": "1000ms"
      },
      "throughput": {
        "requestsPerSecond": 50,
        "dataTransferGB": 10
      },
      "availability": "99.5%"
    },
    "autoScalingPlan": {
      "enabled": true,
      "scalingPolicy": "horizontal",
      "triggers": [
        {
          "type": "cpu",
          "threshold": 70,
          "action": "scale_up",
          "description": "Scale up when CPU > 70%"
        }
      ],
      "limits": {
        "minInstances": 1,
        "maxInstances": 5,
        "targetCPUUtilization": 70,
        "targetMemoryUtilization": 80
      },
      "cooldownPeriod": 300,
      "estimatedCostImpact": "+$20-100/month"
    },
    "scalingTiers": [
      {
        "name": "Starter",
        "concurrentUsers": 100,
        "monthlyCost": 28.67,
        "features": ["Basic auto-scaling", "EC2-based", "CloudFront caching", "WAF security", "Free tier"],
        "autoScaling": true,
        "estimatedTraffic": {
          "dailyRequests": 10000,
          "peakRequestsPerSecond": 10
        }
      },
      {
        "name": "Growth",
        "concurrentUsers": 500,
        "monthlyCost": 60.00,
        "features": ["Enhanced auto-scaling", "Better performance", "Monitoring", "Caching", "Security"],
        "autoScaling": true,
        "estimatedTraffic": {
          "dailyRequests": 50000,
          "peakRequestsPerSecond": 50
        }
      }
    ]
  },
  "mediumCost": { /* similar structure with higher capacities */ },
  "highCost": { /* similar structure with enterprise capabilities */ }
}

User Requirements: ${prompt}`;

    // Use OpenAI as primary, Anthropic as fallback
    let response;
    try {
      console.log('[Infrastructure Tiers] Attempting OpenAI request...');
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 8000,
        temperature: 0.3,
        messages: [
          { role: "user", content: systemPrompt }
        ]
      });
      console.log('[Infrastructure Tiers] OpenAI request successful');
    } catch (openaiError: any) {
      console.log('[Infrastructure Tiers] OpenAI failed, trying Anthropic:', openaiError);
      try {
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 8000,
          temperature: 0.3,
          messages: [
            { role: "user", content: systemPrompt }
          ]
        });
        console.log('[Infrastructure Tiers] Anthropic fallback successful');
      } catch (anthropicError: any) {
        console.error('[Infrastructure Tiers] Both AI providers failed:', { openaiError, anthropicError });
        throw new Error(`AI providers failed: ${openaiError?.message || 'OpenAI failed'}, ${anthropicError?.message || 'Anthropic failed'}`);
      }
    }

    // Parse response
    let content: string;
    if ('choices' in response) {
      // OpenAI response
      content = response.choices[0]?.message?.content || "";
    } else {
      // Anthropic response
      content = response.content[0]?.type === 'text' ? response.content[0].text : "";
    }

    if (!content) {
      throw new Error('Empty response from AI provider');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const infrastructureOptions: InfrastructureOptions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    // Validate the response structure
    if (!infrastructureOptions.lowCost || !infrastructureOptions.mediumCost || !infrastructureOptions.highCost) {
      throw new Error('Invalid infrastructure options structure');
    }

    console.log('[Infrastructure Tiers] Successfully generated three tiers');
    return infrastructureOptions;

  } catch (error: any) {
    console.error('[Infrastructure Tiers] Error generating infrastructure tiers:', error);
    throw error;
  }
};

export const generateDetailedInfrastructure = async (prompt: string, tierType: 'lowCost' | 'mediumCost' | 'highCost', region: string = 'us-east-1'): Promise<InfrastructureTier> => {
  try {
    console.log(`[Infrastructure Tiers] Generating detailed infrastructure for ${tierType} in region ${region}...`);
    
    // Determine if user requested EC2-based architecture
    const userWantsEC2 = prompt.toLowerCase().includes('ec2') || 
                        prompt.toLowerCase().includes('instance') || 
                        prompt.toLowerCase().includes('server') || 
                        prompt.toLowerCase().includes('vm');
    
    console.log(`[Infrastructure Tiers] User wants EC2: ${userWantsEC2}, Tier: ${tierType}`);
    
    const tierDescriptions = {
      lowCost: userWantsEC2 ? "LOW COST, HIGH MAINTENANCE - EC2-based architecture with minimal managed services" : "LOW COST, HIGH MAINTENANCE - Serverless architecture with minimal managed services",
      mediumCost: "MEDIUM COST, MEDIUM MAINTENANCE - Balanced approach with some managed services",
      highCost: "HIGH COST, LOW MAINTENANCE - Fully managed services with maximum automation"
    };
    
    const systemPrompt = `You are an expert AWS cloud architect. Generate detailed infrastructure for the ${tierDescriptions[tierType]} approach.

User Requirements: ${prompt}
Target AWS Region: ${region}
User Wants EC2: ${userWantsEC2}

CRITICAL REQUIREMENTS:
- Generate complete Terraform code for AWS infrastructure
- Use the specified region: ${region} in the AWS provider configuration
- Create detailed Mermaid architecture diagram that EXACTLY matches the Terraform code
- Use appropriate AWS services for the ${tierType} approach
- Follow AWS best practices for security and scalability
- Include proper variable definitions and outputs
- Ensure all resources are created in the specified region: ${region}
- Include proper error handling and validation
- Use unique resource names to avoid conflicts
- Include proper data sources for account and region information
- Add comprehensive tags for resource management
- The architecture diagram MUST show the exact same components and flow as the Terraform code

TERRAFORM BEST PRACTICES (CRITICAL):
- Use aws_s3_bucket_acl resource instead of deprecated 'acl' argument
- Use aws_s3_bucket_website_configuration resource instead of deprecated 'website' argument
- For API Gateway: Use aws_api_gateway_stage resource with deployment_id, NOT stage_name in aws_api_gateway_deployment
- For API Gateway URL: Use aws_api_gateway_stage.invoke_url, NOT aws_api_gateway_deployment.invoke_url
- Always include proper IAM roles and security groups
- Use data sources for current AWS account and region information
- Include proper tags for resource management
- **FOR LOW-COST TIER: Use EC2 instances instead of Lambda for compute when user requests EC2**
- **FOR LOW-COST TIER: Use Application Load Balancer instead of API Gateway when using EC2**
- **EC2 ARCHITECTURE REQUIREMENT: If User Wants EC2 = true, ALWAYS use EC2 instances + Application Load Balancer + S3 + DynamoDB for low-cost tier**
- **SERVERLESS ARCHITECTURE: If User Wants EC2 = false, use Lambda + API Gateway + S3 + DynamoDB for low-cost tier**
- Include data storage that fits the tier and user needs (DynamoDB for serverless/NoSQL, RDS for relational, S3-only for static) and add required IAM policies accordingly
- For Lambda: Use supported runtimes (nodejs18.x, nodejs20.x, python3.9, python3.10, python3.11, python3.12)
- For EC2: Use t3.micro for low-cost, t3.small for medium-cost, m5.large for high-cost
- For EC2: Prefer using an existing VPC/subnets if available; otherwise create a minimal new VPC with 2 public subnets
- **CRITICAL: ALWAYS include data "aws_availability_zones" "available" { state = "available" }**
- If creating a new VPC: create aws_vpc.main (10.0.0.0/16), 2 public subnets in different AZs, an internet gateway, and a public route table; set local.vpc_id accordingly
- For EC2 instances, choose a suitable subnet (created or existing)
- For ALB, use 2+ subnets across AZs
- For security groups, use the selected VPC id
- **NOTE: WAF is not included - API Gateway provides sufficient security for basic applications**
- For ALB: Use all available subnets (data.aws_subnets.default.ids) for multi-AZ deployment
- For S3 public buckets: Always include aws_s3_bucket_public_access_block to disable public access blocks
- For S3 ACLs: Always include aws_s3_bucket_ownership_controls with object_ownership = "ObjectWriter"
- Use unique resource names with account ID + random string suffixes to avoid conflicts
- ALWAYS include data sources: data "aws_caller_identity" "current" {} and data "aws_region" "current" {}
- Use proper Terraform interpolation: \${data.aws_caller_identity.current.account_id} (with backslash escape)
- IMPORTANT: Use hyphens (-) instead of underscores (_) in resource names for better compatibility
- Resource names must be valid: only alphanumeric, hyphens, and underscores allowed
- ALWAYS include random provider for unique naming: provider "random" {}
- Include random_string resource for unique suffixes

CORRECT TERRAFORM SYNTAX EXAMPLES:
# Provider configuration
provider "aws" {
  region = "\${data.aws_region.current.name}"
}

provider "random" {}

# Data sources for account and region information (ALWAYS include these):
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Random string for unique naming (MUST come first)
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket (correct way with public access handling):
resource "aws_s3_bucket" "static_website" {
  bucket = "my-static-website-bucket-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  tags = {
    Name = "Static Website Bucket"
  }
}

# Disable block public access for website hosting
resource "aws_s3_bucket_public_access_block" "static_website_public_access" {
  bucket = aws_s3_bucket.static_website.id
  
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket ownership controls (required for ACLs)
resource "aws_s3_bucket_ownership_controls" "static_website_ownership" {
  bucket = aws_s3_bucket.static_website.id
  depends_on = [aws_s3_bucket_public_access_block.static_website_public_access]

  rule {
    object_ownership = "ObjectWriter"
  }
}

resource "aws_s3_bucket_acl" "static_website_acl" {
  depends_on = [aws_s3_bucket_ownership_controls.static_website_ownership]
  bucket = aws_s3_bucket.static_website.id
  acl    = "public-read"
}

resource "aws_s3_bucket_website_configuration" "static_website_config" {
  bucket = aws_s3_bucket.static_website.id
  index_document {
    suffix = "index.html"
  }
}

# IAM Role (correct way with proper naming):
resource "aws_iam_role" "lambda_exec" {
  name = "lambda-exec-role-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name = "Lambda Execution Role"
  }
}

# Data sources for VPC and subnets (ALWAYS include these)
data "aws_availability_zones" "available" {
  state = "available"
}

# Always create a new VPC since there's no default VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "Main VPC"
  }
}

# Use the created VPC
locals {
  vpc_id = aws_vpc.main.id
}

# Create subnets in the new VPC
resource "aws_subnet" "public" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "Public Subnet \${count.index + 1}"
  }
}

# Internet Gateway for the VPC
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "Main Internet Gateway"
  }
}

# Route table for the VPC
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "Public Route Table"
  }
}

# Route table association
resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# EC2 Instance (for low-cost tier when user requests EC2):
resource "aws_instance" "web_server" {
  ami           = "ami-0c02fb55956c7d316"  # Amazon Linux 2 AMI
  instance_type = "t3.micro"
  
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  subnet_id              = aws_subnet.public[0].id
  
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from EC2!</h1>" > /var/www/html/index.html
              EOF
  
  tags = {
    Name = "Web Server"
  }
}

# Security Group for EC2:
resource "aws_security_group" "web_sg" {
  name        = "web-sg-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  description = "Security group for web server"
  vpc_id      = local.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "Web Security Group"
  }
}

# Security Group for ALB:
resource "aws_security_group" "alb_sg" {
  name        = "alb-sg-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  description = "Security group for Application Load Balancer"
  vpc_id      = local.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ALB Security Group"
  }
}

# Application Load Balancer (for EC2-based architecture):
resource "aws_lb" "web_alb" {
  name               = "web-alb-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "Web Application Load Balancer"
  }
}

# Lambda Function (correct way with supported runtime):
resource "aws_lambda_function" "my_lambda" {
  filename         = "lambda_function.zip"
  function_name    = "my-lambda-function-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  role            = aws_iam_role.lambda_exec.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"  # Use supported runtime
  memory_size     = 128
  timeout         = 3
  
  tags = {
    Name = "My Lambda Function"
  }
}

# API Gateway (correct way):
resource "aws_api_gateway_deployment" "api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  depends_on = [aws_api_gateway_integration.api_integration]
}

resource "aws_api_gateway_stage" "api_stage" {
  deployment_id = aws_api_gateway_deployment.api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "prod"
}

output "api_gateway_url" {
  value = aws_api_gateway_stage.api_stage.invoke_url
}

# DynamoDB Table (for data storage):
resource "aws_dynamodb_table" "app_table" {
  name           = "app-table-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "Application Data Table"
  }
}

# IAM Role for Lambda to access DynamoDB:
resource "aws_iam_role_policy" "lambda_dynamodb_policy" {
  name = "lambda-dynamodb-policy-\${data.aws_caller_identity.current.account_id}-\${random_string.bucket_suffix.result}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.app_table.arn
      }
    ]
  })
}



# CloudFront Distribution (for caching):
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_All"

  origin {
    domain_name = aws_s3_bucket.static_website.bucket_regional_domain_name
    origin_id   = "S3-Origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "CloudFront Distribution"
  }
}

# CloudFront Origin Access Identity:
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for S3 bucket access"
}

# S3 Bucket Policy for CloudFront:
resource "aws_s3_bucket_policy" "static_website_policy" {
  bucket = aws_s3_bucket.static_website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "\${aws_s3_bucket.static_website.arn}/*"
      },
      {
        Sid       = "CloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "\${aws_s3_bucket.static_website.arn}/*"
      }
    ]
  })
}

# Example Mermaid Architecture Diagram (for LOW COST tier):
# flowchart TD
#     User[User] -->|HTTP Request| CloudFront[CloudFront CDN]
#     CloudFront -->|Cache Hit| User
#     CloudFront -->|Cache Miss| S3[S3 Static Website]
#     User -->|API Request| API[API Gateway]
#     API -->|Invoke| Lambda[AWS Lambda]
#     Lambda -->|Process| S3
#     S3 -->|Serve| CloudFront
#     
#     style User fill:#ff9f43
#     style CloudFront fill:#74b9ff
#     style API fill:#00b894
#     style Lambda fill:#fd79a8
#     style S3 fill:#fdcb6e

ARCHITECTURE REQUIREMENTS BY TIER:
- LOW COST: Choose serverless (Lambda + API Gateway + S3) or EC2 (ALB + EC2 + S3) based on user intent; include a fitting data store (DynamoDB for NoSQL or omit if static-only)
- MEDIUM COST: Add caching (CloudFront and/or ElastiCache) and a more capable data store if needed
- HIGH COST: Add managed databases (RDS) or enterprise features if justified by the prompt and performance needs

SUPPORTED AWS SERVICES AND LIMITATIONS:
- Lambda Runtimes: nodejs18.x, nodejs20.x, python3.9, python3.10, python3.11, python3.12 (nodejs14.x is deprecated)
- S3 Buckets: Must handle public access blocks for website hosting
- API Gateway: Use REST API (not HTTP API) for better compatibility
- IAM: Always use least privilege principle
- Security Groups: Include proper ingress/egress rules

ARCHITECTURE DIAGRAM REQUIREMENTS:
- Must show User → API Gateway → Lambda → S3 flow for serverless
- Must include all components that are actually created in Terraform code
- Must show data flow and service interactions accurately
- Use consistent naming between diagram and code

AWS COST REFERENCE (2024) for region ${region}:
${JSON.stringify(AWS_COST_REFERENCE, null, 2)}

Return the response in this exact JSON format:
{
  "name": "Tier Name",
  "description": "Detailed description",
  "terraformCode": "Complete Terraform code here (must include provider \\"aws\\" { region = \\"${region}\\" })",
  "architectureDiagram": "flowchart TD\\\\n    User[User] -->|HTTP Request| API[API Gateway]\\\\n    API -->|Invoke| Lambda[AWS Lambda]\\\\n    Lambda -->|Process| S3[S3 Static Website]\\\\n    S3 -->|Serve| User\\\\n    \\\\n    style User fill:#ff9f43\\\\n    style API fill:#74b9ff\\\\n    style Lambda fill:#00b894\\\\n    style S3 fill:#fd79a8",
  "maintenanceLevel": "high",
  "pros": ["Lowest cost", "Serverless"],
  "cons": ["Manual scaling", "Limited features"],
  "isDetailed": true
}

Note: Cost breakdown will be calculated automatically based on the Terraform code.`;

    // Use OpenAI as primary, Anthropic as fallback
    let response;
    try {
      console.log('[Infrastructure Tiers] Attempting OpenAI request for detailed infrastructure...');
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 8000,
        temperature: 0.3,
        messages: [
          { role: "user", content: systemPrompt }
        ]
      });
      console.log('[Infrastructure Tiers] OpenAI request successful for detailed infrastructure');
    } catch (openaiError: any) {
      console.log('[Infrastructure Tiers] OpenAI failed, trying Anthropic for detailed infrastructure:', openaiError);
      try {
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 8000,
          temperature: 0.3,
          messages: [
            { role: "user", content: systemPrompt }
          ]
        });
        console.log('[Infrastructure Tiers] Anthropic fallback successful for detailed infrastructure');
      } catch (anthropicError: any) {
        console.error('[Infrastructure Tiers] Both AI providers failed for detailed infrastructure:', { openaiError, anthropicError });
        throw new Error(`AI providers failed: ${openaiError?.message || 'OpenAI failed'}, ${anthropicError?.message || 'Anthropic failed'}`);
      }
    }

    // Parse response
    let content: string;
    if ('choices' in response) {
      // OpenAI response
      content = response.choices[0]?.message?.content || "";
    } else {
      // Anthropic response
      content = response.content[0]?.type === 'text' ? response.content[0].text : "";
    }

    if (!content) {
      throw new Error('Empty response from AI provider');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const detailedTier: InfrastructureTier = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    detailedTier.isDetailed = true;
    
    // Use the enhanced cost calculation function to ensure consistency
    if (detailedTier.terraformCode) {
      const enhancedCostBreakdown = calculateDetailedCosts(detailedTier.terraformCode);
      detailedTier.costBreakdown = enhancedCostBreakdown;
      detailedTier.estimatedMonthlyCost = enhancedCostBreakdown.totalMonthlyCost;
    }
    
    console.log('[Infrastructure Tiers] Successfully generated detailed infrastructure with enhanced cost calculation');
    return detailedTier;

  } catch (error: any) {
    console.error('[Infrastructure Tiers] Error generating detailed infrastructure:', error);
    throw error;
  }
};

export const calculateDetailedCosts = (terraformCode: string, usageEstimates: any = {}): CostBreakdown => {
  // This function can be enhanced to parse Terraform code and calculate more accurate costs
  // For now, it provides a basic cost estimation framework
  
  const resources: ResourceCost[] = [];
  let totalMonthlyCost = 0;

  // Basic cost estimation based on common patterns
  if (terraformCode.includes('aws_s3_bucket')) {
    const s3Cost = 0.50; // Basic S3 cost
    resources.push({
      service: 'S3',
      resource: 'Static Website Hosting',
      estimatedMonthlyCost: s3Cost,
      costCalculation: '1GB storage × $0.023 + 10K requests × $0.0004',
      notes: 'Free tier eligible for first 12 months'
    });
    totalMonthlyCost += s3Cost;
  }

  if (terraformCode.includes('aws_lambda_function')) {
    const lambdaCost = 1.00; // Basic Lambda cost
    resources.push({
      service: 'Lambda',
      resource: 'Serverless Functions',
      estimatedMonthlyCost: lambdaCost,
      costCalculation: '1M requests × $0.20 + 400K GB-seconds × $0.0000166667',
      notes: 'Free tier: 1M requests and 400K GB-seconds per month'
    });
    totalMonthlyCost += lambdaCost;
  }

  if (terraformCode.includes('aws_api_gateway_rest_api')) {
    const apiCost = 3.50; // Basic API Gateway cost
    resources.push({
      service: 'API Gateway',
      resource: 'REST API',
      estimatedMonthlyCost: apiCost,
      costCalculation: '1M requests × $3.50',
      notes: 'Free tier: 1M requests per month'
    });
    totalMonthlyCost += apiCost;
  }

  if (terraformCode.includes('aws_dynamodb_table')) {
    const dynamoCost = 2.50; // Basic DynamoDB cost
    resources.push({
      service: 'DynamoDB',
      resource: 'NoSQL Database',
      estimatedMonthlyCost: dynamoCost,
      costCalculation: '1GB storage × $0.25 + 1M read requests × $1.25',
      notes: 'Free tier: 25GB storage and 25 read/write capacity units'
    });
    totalMonthlyCost += dynamoCost;
  }

  if (terraformCode.includes('aws_instance')) {
    const ec2Cost = 8.47; // t3.micro cost
    resources.push({
      service: 'EC2',
      resource: 't3.micro Instance',
      estimatedMonthlyCost: ec2Cost,
      costCalculation: '1 instance × $8.47 per month',
      notes: 'Free tier: 750 hours per month for first 12 months'
    });
    totalMonthlyCost += ec2Cost;
  }

  // Application Load Balancer
  if (terraformCode.includes('aws_lb') && terraformCode.includes('application')) {
    const albCost = 16.20; // ALB cost
    resources.push({
      service: 'Application Load Balancer',
      resource: 'Load Balancer',
      estimatedMonthlyCost: albCost,
      costCalculation: '16 hours × $1.0125 per hour',
      notes: 'Basic load balancing'
    });
    totalMonthlyCost += albCost;
  }

  // CloudFront CDN
  if (terraformCode.includes('aws_cloudfront_distribution')) {
    const cloudfrontCost = 0.50; // CloudFront cost
    resources.push({
      service: 'CloudFront',
      resource: 'CDN Caching',
      estimatedMonthlyCost: cloudfrontCost,
      costCalculation: '10GB data transfer × $0.085 per GB',
      notes: 'Free tier eligible'
    });
    totalMonthlyCost += cloudfrontCost;
  }



  // ElastiCache Redis (for medium/high cost tiers)
  if (terraformCode.includes('aws_elasticache_cluster') || terraformCode.includes('aws_elasticache_subnet_group')) {
    const elasticacheCost = 15.00; // ElastiCache cost
    resources.push({
      service: 'ElastiCache',
      resource: 'Redis Cache',
      estimatedMonthlyCost: elasticacheCost,
      costCalculation: 'cache.t3.micro instance × $15.00 per month',
      notes: 'Application caching layer'
    });
    totalMonthlyCost += elasticacheCost;
  }

  // RDS Database (for medium/high cost tiers)
  if (terraformCode.includes('aws_db_instance')) {
    const rdsCost = 25.00; // RDS cost
    resources.push({
      service: 'RDS',
      resource: 'Managed Database',
      estimatedMonthlyCost: rdsCost,
      costCalculation: 'db.t3.micro instance × $25.00 per month',
      notes: 'Managed database service'
    });
    totalMonthlyCost += rdsCost;
  }

  const costNotes = [
    'Prices are estimates based on typical usage patterns',
    'Actual costs may vary based on usage and region',
    'Free tier benefits apply for first 12 months',
    'Consider data transfer costs for high-traffic applications'
  ];

  return {
    resources,
    totalMonthlyCost,
    costNotes
  };
}; 