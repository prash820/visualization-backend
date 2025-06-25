import { Request, Response } from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

export interface InfrastructureJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  terraformOutputs?: any;
}

export interface InfrastructureStatus {
  projectId: string;
  deploymentStatus: 'not_deployed' | 'pending' | 'deployed' | 'failed' | 'destroyed';
  deploymentJobId?: string;
  deploymentOutputs?: any;
  terraformState?: any;
  lastUpdated?: string;
}

export interface TerraformOutputs {
  [key: string]: string;
}

export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: { [key: string]: any };
  resources: any[];
}

export class InfrastructureService {
  private static readonly TERRAFORM_RUNNER_URL = "http://localhost:8000";

  /**
   * Deploy infrastructure using Terraform
   */
  static async deployInfrastructure(projectId: string, iacCode: string): Promise<{ jobId: string; status: string; message: string }> {
    try {
      // Save IaC code to file
      this.saveIaCToFile(projectId, iacCode);

      // Call Terraform runner
      const response = await fetch(`${this.TERRAFORM_RUNNER_URL}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`Terraform runner responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === "success") {
        return {
          jobId: `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          status: "completed",
          message: "Infrastructure deployed successfully"
        };
      } else {
        throw new Error(result.stderr || "Terraform deployment failed");
      }
    } catch (error: any) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Destroy infrastructure using Terraform
   */
  static async destroyInfrastructure(projectId: string): Promise<{ jobId: string; status: string; message: string }> {
    try {
      const response = await fetch(`${this.TERRAFORM_RUNNER_URL}/destroy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`Terraform runner responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === "success") {
        return {
          jobId: `destroy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          status: "completed",
          message: "Infrastructure destroyed successfully"
        };
      } else {
        throw new Error(result.stderr || "Terraform destruction failed");
      }
    } catch (error: any) {
      throw new Error(`Destruction failed: ${error.message}`);
    }
  }

  /**
   * Get Terraform outputs for a project
   */
  static async getTerraformOutputs(projectId: string): Promise<TerraformOutputs> {
    try {
      const response = await fetch(`${this.TERRAFORM_RUNNER_URL}/outputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`Terraform runner responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === "success") {
        return result.outputs || {};
      } else {
        throw new Error(result.error || "Failed to get Terraform outputs");
      }
    } catch (error: any) {
      throw new Error(`Failed to get outputs: ${error.message}`);
    }
  }

  /**
   * Get Terraform state for a project
   */
  static async getTerraformState(projectId: string): Promise<TerraformState | null> {
    try {
      const response = await fetch(`${this.TERRAFORM_RUNNER_URL}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`Terraform runner responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === "success") {
        return result.state || null;
      } else {
        throw new Error(result.error || "Failed to get Terraform state");
      }
    } catch (error: any) {
      throw new Error(`Failed to get state: ${error.message}`);
    }
  }

  /**
   * Get comprehensive infrastructure status for a project
   */
  static async getInfrastructureStatus(projectId: string): Promise<InfrastructureStatus> {
    try {
      // Get project details
      const { getProjectById } = await import("../utils/projectFileStore");
      const project = await getProjectById(projectId);
      
      if (!project) {
        throw new Error("Project not found");
      }

      // Get Terraform state
      let terraformState = null;
      try {
        terraformState = await this.getTerraformState(projectId);
      } catch (stateError) {
        console.warn(`Could not retrieve Terraform state for project ${projectId}:`, stateError);
      }

      return {
        projectId,
        deploymentStatus: project.deploymentStatus || "not_deployed",
        deploymentJobId: project.deploymentJobId,
        deploymentOutputs: project.deploymentOutputs,
        terraformState,
        lastUpdated: project.updatedAt || project.createdAt
      };
    } catch (error: any) {
      throw new Error(`Failed to get infrastructure status: ${error.message}`);
    }
  }

  /**
   * Validate Terraform configuration
   */
  static async validateTerraformConfig(projectId: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // Get project details from store
      const { getProjectById } = await import("../utils/projectFileStore");
      const project = await getProjectById(projectId);
      
      if (!project) {
        return {
          valid: false,
          errors: ["Project not found"]
        };
      }

      if (!project.infraCode) {
        return {
          valid: false,
          errors: ["No infrastructure code found for this project"]
        };
      }

      // Validate the infrastructure code content
      const content = project.infraCode;
      const errors: string[] = [];

      // Check for basic Terraform blocks
      if (!content.includes('terraform {')) {
        errors.push("Missing terraform block");
      }

      if (!content.includes('provider "aws"')) {
        errors.push("Missing AWS provider configuration");
      }

      if (!content.includes('resource "aws_')) {
        errors.push("No AWS resources defined");
      }

      // Additional validation checks
      if (content.trim().length < 50) {
        errors.push("Infrastructure code appears to be too short or incomplete");
      }

      // Check for common syntax issues
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push("Mismatched curly braces in configuration");
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }

  /**
   * Get estimated costs for infrastructure
   */
  static async estimateCosts(projectId: string): Promise<{ estimated: boolean; costs: any; message: string }> {
    try {
      const terraformState = await this.getTerraformState(projectId);
      
      if (!terraformState || !terraformState.resources) {
        return {
          estimated: false,
          costs: {},
          message: "No infrastructure deployed to estimate costs"
        };
      }

      // Simple cost estimation based on resource types
      const costs: any = {
        compute: 0,
        storage: 0,
        networking: 0,
        database: 0,
        total: 0
      };

      const resourceCounts: { [key: string]: number } = {};

      terraformState.resources.forEach((resource: any) => {
        const resourceType = resource.type;
        resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;
      });

      // Rough monthly cost estimates (these are very approximate)
      const costEstimates: { [key: string]: number } = {
        'aws_instance': 50, // EC2 instance
        'aws_lambda_function': 5, // Lambda function
        'aws_s3_bucket': 10, // S3 bucket
        'aws_dynamodb_table': 25, // DynamoDB table
        'aws_rds_instance': 100, // RDS instance
        'aws_api_gateway_rest_api': 5, // API Gateway
        'aws_cloudfront_distribution': 15, // CloudFront
        'aws_elasticache_cluster': 75, // ElastiCache
      };

      Object.entries(resourceCounts).forEach(([resourceType, count]) => {
        const costPerResource = costEstimates[resourceType] || 10;
        const totalCost = costPerResource * count;
        costs.total += totalCost;

        // Categorize costs
        if (resourceType.includes('instance') || resourceType.includes('lambda')) {
          costs.compute += totalCost;
        } else if (resourceType.includes('s3') || resourceType.includes('bucket')) {
          costs.storage += totalCost;
        } else if (resourceType.includes('api_gateway') || resourceType.includes('cloudfront')) {
          costs.networking += totalCost;
        } else if (resourceType.includes('rds') || resourceType.includes('dynamodb') || resourceType.includes('elasticache')) {
          costs.database += totalCost;
        }
      });

      return {
        estimated: true,
        costs: {
          ...costs,
          resourceCounts,
          currency: "USD",
          period: "monthly"
        },
        message: "Cost estimation completed"
      };
    } catch (error: any) {
      return {
        estimated: false,
        costs: {},
        message: `Failed to estimate costs: ${error.message}`
      };
    }
  }

  /**
   * Save IaC code to file
   */
  private static saveIaCToFile(projectId: string, iacCode: string): string {
    const workspaceDir = path.join(process.cwd(), "terraform-runner/workspace", projectId);
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    const filePath = path.join(workspaceDir,"terraform.tf");
    fs.writeFileSync(filePath, iacCode);
    return workspaceDir;
  }
} 