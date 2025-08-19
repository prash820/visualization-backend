import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { CostExplorerClient, GetCostAndUsageCommand, Granularity, GroupDefinitionType } from '@aws-sdk/client-cost-explorer';

export interface InfrastructureConfig {
  projectId: string;
  userId: string;
  region: string;
  environment: 'development' | 'staging' | 'production';
  costLimit: number; // Monthly cost limit in USD
  autoCleanup: boolean;
  cleanupAfterHours: number;
}

export interface ResourceStatus {
  resourceId: string;
  resourceType: string;
  status: 'creating' | 'running' | 'stopped' | 'failed' | 'deleting';
  cost: number;
  lastUpdated: Date;
  tags: Record<string, string>;
}

export interface CostAnalysis {
  totalCost: number;
  monthlyEstimate: number;
  costBreakdown: Record<string, number>;
  costAlerts: string[];
  isOverBudget: boolean;
}

export interface DeploymentResult {
  success: boolean;
  resources: ResourceStatus[];
  costAnalysis: CostAnalysis;
  deploymentUrl?: string;
  adminUrl?: string;
  error?: string;
  terraformOutput?: any;
}

export class EnhancedInfrastructureManager {
  private config: InfrastructureConfig;
  private terraformPath: string;
  private statePath: string;
  private awsCredentials: any; // Changed to any as AWS.Credentials is removed

  constructor(config: InfrastructureConfig) {
    this.config = config;
    this.terraformPath = path.join(process.cwd(), 'terraform-runner');
    this.statePath = path.join(this.terraformPath, 'state', `${config.projectId}.tfstate`);
    this.awsCredentials = new STSClient({
      region: config.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    });
  }

  /**
   * Deploy infrastructure with comprehensive validation and cost control
   */
  async deployInfrastructure(terraformCode: string): Promise<DeploymentResult> {
    console.log(`[EnhancedInfrastructureManager] Starting deployment for project ${this.config.projectId}`);

    try {
      // Step 1: Validate Terraform code
      const validationResult = await this.validateTerraformCode(terraformCode);
      if (!validationResult.isValid) {
        return {
          success: false,
          resources: [],
          costAnalysis: { totalCost: 0, monthlyEstimate: 0, costBreakdown: {}, costAlerts: [], isOverBudget: false },
          error: `Terraform validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Step 2: Cost estimation before deployment
      const costEstimate = await this.estimateDeploymentCost(terraformCode);
      if (costEstimate.monthlyEstimate > this.config.costLimit) {
        return {
          success: false,
          resources: [],
          costAnalysis: costEstimate,
          error: `Deployment would exceed cost limit of $${this.config.costLimit}/month. Estimated: $${costEstimate.monthlyEstimate}/month`
        };
      }

      // Step 3: Prepare Terraform files
      await this.prepareTerraformFiles(terraformCode);

      // Step 4: Initialize Terraform
      const initResult = await this.initializeTerraform();
      if (!initResult.success) {
        return {
          success: false,
          resources: [],
          costAnalysis: costEstimate,
          error: `Terraform initialization failed: ${initResult.error}`
        };
      }

      // Step 5: Plan deployment
      const planResult = await this.planTerraform();
      if (!planResult.success) {
        return {
          success: false,
          resources: [],
          costAnalysis: costEstimate,
          error: `Terraform plan failed: ${planResult.error}`
        };
      }

      // Step 6: Apply deployment
      const applyResult = await this.applyTerraform();
      if (!applyResult.success) {
        return {
          success: false,
          resources: [],
          costAnalysis: costEstimate,
          error: `Terraform apply failed: ${applyResult.error}`
        };
      }

      // Step 7: Monitor deployment
      const resources = await this.monitorDeployment();
      const costAnalysis = await this.analyzeCurrentCosts();

      // Step 8: Set up auto-cleanup if enabled
      if (this.config.autoCleanup) {
        await this.scheduleCleanup();
      }

      return {
        success: true,
        resources,
        costAnalysis,
        deploymentUrl: applyResult.deploymentUrl,
        adminUrl: applyResult.adminUrl,
        terraformOutput: applyResult.output
      };

    } catch (error) {
      console.error(`[EnhancedInfrastructureManager] Deployment failed:`, error);
      return {
        success: false,
        resources: [],
        costAnalysis: { totalCost: 0, monthlyEstimate: 0, costBreakdown: {}, costAlerts: [], isOverBudget: false },
        error: `Deployment failed: ${error}`
      };
    }
  }

  /**
   * Validate Terraform code for syntax and security
   */
  private async validateTerraformCode(terraformCode: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Write Terraform code to temporary file
      const tempFile = path.join(this.terraformPath, 'temp', `validate-${Date.now()}.tf`);
      fs.writeFileSync(tempFile, terraformCode);

      // Run terraform validate
      const result = await this.runTerraformCommand(['validate'], path.dirname(tempFile));
      
      if (result.exitCode !== 0) {
        errors.push(`Terraform validation failed: ${result.output}`);
      }

      // Security checks
      const securityIssues = this.checkSecurityIssues(terraformCode);
      errors.push(...securityIssues);

      // Clean up temp file
      fs.unlinkSync(tempFile);

      return { isValid: errors.length === 0, errors };

    } catch (error) {
      errors.push(`Validation process failed: ${error}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Estimate deployment costs using AWS Pricing API
   */
  private async estimateDeploymentCost(terraformCode: string): Promise<CostAnalysis> {
    const costBreakdown: Record<string, number> = {};
    let totalMonthlyCost = 0;

    try {
      // Parse Terraform resources
      const resources = this.parseTerraformResources(terraformCode);
      
      // Initialize AWS Pricing API
      const pricing = new CostExplorerClient({ region: 'us-east-1' });

      for (const resource of resources) {
        const estimatedCost = await this.estimateResourceCost(resource, pricing);
        costBreakdown[resource.type] = estimatedCost;
        totalMonthlyCost += estimatedCost;
      }

      // Add cost alerts
      const costAlerts: string[] = [];
      if (totalMonthlyCost > this.config.costLimit * 0.8) {
        costAlerts.push(`Warning: Estimated cost ($${totalMonthlyCost}/month) is approaching limit ($${this.config.costLimit}/month)`);
      }

      return {
        totalCost: 0, // Current cost is 0 for new deployment
        monthlyEstimate: totalMonthlyCost,
        costBreakdown,
        costAlerts,
        isOverBudget: totalMonthlyCost > this.config.costLimit
      };

    } catch (error) {
      console.error('[EnhancedInfrastructureManager] Cost estimation failed:', error);
      return {
        totalCost: 0,
        monthlyEstimate: 0,
        costBreakdown: {},
        costAlerts: ['Cost estimation failed'],
        isOverBudget: false
      };
    }
  }

  /**
   * Prepare Terraform files with proper configuration
   */
  private async prepareTerraformFiles(terraformCode: string): Promise<void> {
    const projectDir = path.join(this.terraformPath, 'projects', this.config.projectId);
    
    // Create project directory
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Write main Terraform configuration
    const mainTf = path.join(projectDir, 'main.tf');
    fs.writeFileSync(mainTf, terraformCode);

    // Write provider configuration
    const providerTf = path.join(projectDir, 'provider.tf');
    const providerConfig = this.generateProviderConfig();
    fs.writeFileSync(providerTf, providerConfig);

    // Write variables file
    const variablesTf = path.join(projectDir, 'variables.tf');
    const variablesConfig = this.generateVariablesConfig();
    fs.writeFileSync(variablesTf, variablesConfig);

    // Write outputs file
    const outputsTf = path.join(projectDir, 'outputs.tf');
    const outputsConfig = this.generateOutputsConfig();
    fs.writeFileSync(outputsTf, outputsConfig);
  }

  /**
   * Initialize Terraform
   */
  private async initializeTerraform(): Promise<{ success: boolean; error?: string }> {
    try {
      const projectDir = path.join(this.terraformPath, 'projects', this.config.projectId);
      const result = await this.runTerraformCommand(['init'], projectDir);
      
      return {
        success: result.exitCode === 0,
        error: result.exitCode !== 0 ? result.output : undefined
      };
    } catch (error) {
      return { success: false, error: `Initialization failed: ${error}` };
    }
  }

  /**
   * Plan Terraform deployment
   */
  private async planTerraform(): Promise<{ success: boolean; error?: string; plan?: any }> {
    try {
      const projectDir = path.join(this.terraformPath, 'projects', this.config.projectId);
      const result = await this.runTerraformCommand(['plan', '-out=tfplan'], projectDir);
      
      if (result.exitCode !== 0) {
        return { success: false, error: result.output };
      }

      // Parse plan output
      const planResult = await this.runTerraformCommand(['show', '-json', 'tfplan'], projectDir);
      const plan = JSON.parse(planResult.output);

      return { success: true, plan };
    } catch (error) {
      return { success: false, error: `Plan failed: ${error}` };
    }
  }

  /**
   * Apply Terraform deployment
   */
  private async applyTerraform(): Promise<{ success: boolean; error?: string; deploymentUrl?: string; adminUrl?: string; output?: any }> {
    try {
      const projectDir = path.join(this.terraformPath, 'projects', this.config.projectId);
      const result = await this.runTerraformCommand(['apply', '-auto-approve', 'tfplan'], projectDir);
      
      if (result.exitCode !== 0) {
        return { success: false, error: result.output };
      }

      // Get outputs
      const outputResult = await this.runTerraformCommand(['output', '-json'], projectDir);
      const output = JSON.parse(outputResult.output);

      // Extract URLs from output
      const deploymentUrl = output.deployment_url?.value;
      const adminUrl = output.admin_url?.value;

      return { 
        success: true, 
        deploymentUrl, 
        adminUrl, 
        output 
      };
    } catch (error) {
      return { success: false, error: `Apply failed: ${error}` };
    }
  }

  /**
   * Monitor deployment and get resource status
   */
  private async monitorDeployment(): Promise<ResourceStatus[]> {
    const resources: ResourceStatus[] = [];

    try {
      // Get resources from Terraform state
      const projectDir = path.join(this.terraformPath, 'projects', this.config.projectId);
      const stateResult = await this.runTerraformCommand(['show', '-json'], projectDir);
      const state = JSON.parse(stateResult.output);

      // Parse resources from state
      if (state.values?.root_module?.resources) {
        for (const resource of state.values.root_module.resources) {
          const status = await this.getResourceStatus(resource);
          resources.push(status);
        }
      }

    } catch (error) {
      console.error('[EnhancedInfrastructureManager] Monitoring failed:', error);
    }

    return resources;
  }

  /**
   * Analyze current costs
   */
  private async analyzeCurrentCosts(): Promise<CostAnalysis> {
    try {
      // Use AWS Cost Explorer API
      const costExplorer = new CostExplorerClient({ region: 'us-east-1' });
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const params = {
        TimePeriod: {
          Start: startDate.toISOString().split('T')[0],
          End: endDate.toISOString().split('T')[0]
        },
        Granularity: Granularity.MONTHLY,
        Filter: {
          Tags: {
            Key: 'ProjectId',
            Values: [this.config.projectId]
          }
        },
        Metrics: ['UnblendedCost'],
        GroupBy: [
          { Type: GroupDefinitionType.DIMENSION, Key: 'SERVICE' }
        ]
      };

      const result = await costExplorer.send(new GetCostAndUsageCommand(params));
      
      const costBreakdown: Record<string, number> = {};
      let totalCost = 0;

      if (result.ResultsByTime && result.ResultsByTime[0].Groups) {
        for (const group of result.ResultsByTime[0].Groups) {
          const service = group.Keys?.[0] || 'Unknown';
          const cost = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
          costBreakdown[service] = cost;
          totalCost += cost;
        }
      }

      const monthlyEstimate = totalCost; // Assuming 30-day period
      const costAlerts: string[] = [];

      if (monthlyEstimate > this.config.costLimit * 0.8) {
        costAlerts.push(`Warning: Current cost ($${monthlyEstimate}/month) is approaching limit ($${this.config.costLimit}/month)`);
      }

      if (monthlyEstimate > this.config.costLimit) {
        costAlerts.push(`ALERT: Current cost ($${monthlyEstimate}/month) exceeds limit ($${this.config.costLimit}/month)`);
      }

      return {
        totalCost,
        monthlyEstimate,
        costBreakdown,
        costAlerts,
        isOverBudget: monthlyEstimate > this.config.costLimit
      };

    } catch (error) {
      console.error('[EnhancedInfrastructureManager] Cost analysis failed:', error);
      return {
        totalCost: 0,
        monthlyEstimate: 0,
        costBreakdown: {},
        costAlerts: ['Cost analysis failed'],
        isOverBudget: false
      };
    }
  }

  /**
   * Schedule automatic cleanup
   */
  private async scheduleCleanup(): Promise<void> {
    try {
      const cleanupTime = new Date();
      cleanupTime.setHours(cleanupTime.getHours() + this.config.cleanupAfterHours);

      // Store cleanup schedule in database or file
      const cleanupSchedule = {
        projectId: this.config.projectId,
        scheduledTime: cleanupTime.toISOString(),
        userId: this.config.userId
      };

      const scheduleFile = path.join(this.terraformPath, 'cleanup-schedule.json');
      let schedules = [];
      
      if (fs.existsSync(scheduleFile)) {
        schedules = JSON.parse(fs.readFileSync(scheduleFile, 'utf-8'));
      }
      
      schedules.push(cleanupSchedule);
      fs.writeFileSync(scheduleFile, JSON.stringify(schedules, null, 2));

      console.log(`[EnhancedInfrastructureManager] Scheduled cleanup for project ${this.config.projectId} at ${cleanupTime.toISOString()}`);

    } catch (error) {
      console.error('[EnhancedInfrastructureManager] Failed to schedule cleanup:', error);
    }
  }

  /**
   * Clean up infrastructure
   */
  async cleanupInfrastructure(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[EnhancedInfrastructureManager] Starting cleanup for project ${this.config.projectId}`);

      const projectDir = path.join(this.terraformPath, 'projects', this.config.projectId);
      
      // Destroy infrastructure
      const result = await this.runTerraformCommand(['destroy', '-auto-approve'], projectDir);
      
      if (result.exitCode !== 0) {
        return { success: false, error: result.output };
      }

      // Clean up project directory
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true, force: true });
      }

      // Remove from cleanup schedule
      this.removeFromCleanupSchedule();

      console.log(`[EnhancedInfrastructureManager] Cleanup completed for project ${this.config.projectId}`);
      return { success: true };

    } catch (error) {
      console.error('[EnhancedInfrastructureManager] Cleanup failed:', error);
      return { success: false, error: `Cleanup failed: ${error}` };
    }
  }

  // Helper methods
  private async runTerraformCommand(args: string[], cwd: string): Promise<{ exitCode: number; output: string }> {
    return new Promise((resolve) => {
      const terraform = spawn('terraform', args, {
        cwd,
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: this.awsCredentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: this.awsCredentials.secretAccessKey,
          AWS_DEFAULT_REGION: this.config.region
        }
      });

      let output = '';
      
      terraform.stdout?.on('data', (data) => {
        output += data.toString();
      });

      terraform.stderr?.on('data', (data) => {
        output += data.toString();
      });

      terraform.on('close', (code) => {
        resolve({ exitCode: code || 0, output });
      });
    });
  }

  private checkSecurityIssues(terraformCode: string): string[] {
    const issues: string[] = [];
    
    // Check for hardcoded secrets
    if (terraformCode.includes('password') || terraformCode.includes('secret')) {
      issues.push('Potential hardcoded secrets detected');
    }

    // Check for overly permissive IAM policies
    if (terraformCode.includes('"*"') && terraformCode.includes('iam')) {
      issues.push('Overly permissive IAM policy detected');
    }

    return issues;
  }

  private parseTerraformResources(terraformCode: string): Array<{ type: string; name: string; config: any }> {
    // Simple regex-based parsing - in production, use proper Terraform parser
    const resources: Array<{ type: string; name: string; config: any }> = [];
    const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"/g;
    
    let match;
    while ((match = resourceRegex.exec(terraformCode)) !== null) {
      resources.push({
        type: match[1],
        name: match[2],
        config: {}
      });
    }
    
    return resources;
  }

  private async estimateResourceCost(resource: { type: string; name: string; config: any }, pricing: any): Promise<number> {
    // Simplified cost estimation - in production, use AWS Pricing API more comprehensively
    const costMap: Record<string, number> = {
      'aws_lambda_function': 0.20, // $0.20 per million requests
      'aws_s3_bucket': 0.023, // $0.023 per GB
      'aws_dynamodb_table': 0.25, // $0.25 per million reads
      'aws_api_gateway_rest_api': 3.50, // $3.50 per million calls
      'aws_ec2_instance': 10.00, // $10 per month for t3.micro
    };

    return costMap[resource.type] || 1.00; // Default $1/month for unknown resources
  }

  private generateProviderConfig(): string {
    return `
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${this.config.region}"
  
  default_tags {
    tags = {
      ProjectId     = "${this.config.projectId}"
      UserId        = "${this.config.userId}"
      Environment   = "${this.config.environment}"
      ManagedBy     = "VisualizeAI"
      AutoCleanup   = "${this.config.autoCleanup}"
    }
  }
}
`;
  }

  private generateVariablesConfig(): string {
    return `
variable "project_id" {
  description = "Project identifier"
  type        = string
  default     = "${this.config.projectId}"
}

variable "user_id" {
  description = "User identifier"
  type        = string
  default     = "${this.config.userId}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "${this.config.environment}"
}
`;
  }

  private generateOutputsConfig(): string {
    return `
output "deployment_url" {
  description = "URL of the deployed application"
  value       = "https://${this.config.projectId}.${this.config.region}.amazonaws.com"
}

output "admin_url" {
  description = "URL of the admin interface"
  value       = "https://admin.${this.config.projectId}.${this.config.region}.amazonaws.com"
}

output "project_id" {
  description = "Project identifier"
  value       = var.project_id
}
`;
  }

  private async getResourceStatus(resource: any): Promise<ResourceStatus> {
    // Simplified status check - in production, use AWS SDK to get actual status
    return {
      resourceId: resource.address || 'unknown',
      resourceType: resource.type || 'unknown',
      status: 'running', // Default assumption
      cost: 0, // Would be calculated from AWS Cost Explorer
      lastUpdated: new Date(),
      tags: resource.values?.tags || {}
    };
  }

  private removeFromCleanupSchedule(): void {
    try {
      const scheduleFile = path.join(this.terraformPath, 'cleanup-schedule.json');
      if (fs.existsSync(scheduleFile)) {
        const schedules = JSON.parse(fs.readFileSync(scheduleFile, 'utf-8'));
        const filteredSchedules = schedules.filter((s: any) => s.projectId !== this.config.projectId);
        fs.writeFileSync(scheduleFile, JSON.stringify(filteredSchedules, null, 2));
      }
    } catch (error) {
      console.error('[EnhancedInfrastructureManager] Failed to remove from cleanup schedule:', error);
    }
  }
}

export default EnhancedInfrastructureManager; 