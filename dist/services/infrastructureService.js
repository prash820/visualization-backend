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
exports.InfrastructureService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class InfrastructureService {
    /**
     * Deploy infrastructure using Terraform
     */
    static deployInfrastructure(projectId, iacCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Save IaC code to file
                this.saveIaCToFile(projectId, iacCode);
                // Call Terraform runner
                const response = yield (0, node_fetch_1.default)(`${this.TERRAFORM_RUNNER_URL}/deploy`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId }),
                });
                if (!response.ok) {
                    throw new Error(`Terraform runner responded with status: ${response.status}`);
                }
                const result = yield response.json();
                if (result.status === "success") {
                    return {
                        jobId: `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        status: "completed",
                        message: "Infrastructure deployed successfully"
                    };
                }
                else {
                    throw new Error(result.stderr || "Terraform deployment failed");
                }
            }
            catch (error) {
                throw new Error(`Deployment failed: ${error.message}`);
            }
        });
    }
    /**
     * Destroy infrastructure using Terraform
     */
    static destroyInfrastructure(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First check if project exists
                const { getProjectById } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                const project = yield getProjectById(projectId);
                if (!project) {
                    throw new Error("Project not found");
                }
                // Check if infrastructure is actually deployed
                const currentStatus = yield this.getInfrastructureStatus(projectId);
                if (currentStatus.deploymentStatus === 'not_deployed' || currentStatus.deploymentStatus === 'destroyed') {
                    return {
                        jobId: `destroy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        status: "completed",
                        message: "No infrastructure found to destroy"
                    };
                }
                const response = yield (0, node_fetch_1.default)(`${this.TERRAFORM_RUNNER_URL}/destroy`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId }),
                });
                if (!response.ok) {
                    const errorText = yield response.text();
                    throw new Error(`Terraform runner responded with status: ${response.status} - ${errorText}`);
                }
                const result = yield response.json();
                if (result.status === "success") {
                    // Update project status to destroyed
                    project.deploymentStatus = 'destroyed';
                    const { saveProject } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                    yield saveProject(project);
                    return {
                        jobId: `destroy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                        status: "completed",
                        message: "Infrastructure destroyed successfully"
                    };
                }
                else {
                    throw new Error(result.stderr || result.error || "Terraform destruction failed");
                }
            }
            catch (error) {
                // Return a graceful error response instead of throwing
                return {
                    jobId: `destroy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                    status: "failed",
                    message: `Destruction failed: ${error.message}`
                };
            }
        });
    }
    /**
     * Get Terraform outputs for a project
     */
    static getTerraformOutputs(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, node_fetch_1.default)(`${this.TERRAFORM_RUNNER_URL}/outputs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId }),
                });
                if (!response.ok) {
                    throw new Error(`Terraform runner responded with status: ${response.status}`);
                }
                const result = yield response.json();
                if (result.status === "success") {
                    return result.outputs || {};
                }
                else {
                    throw new Error(result.error || "Failed to get Terraform outputs");
                }
            }
            catch (error) {
                throw new Error(`Failed to get outputs: ${error.message}`);
            }
        });
    }
    /**
     * Get Terraform state for a project
     */
    static getTerraformState(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield (0, node_fetch_1.default)(`${this.TERRAFORM_RUNNER_URL}/state`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId }),
                });
                if (!response.ok) {
                    throw new Error(`Terraform runner responded with status: ${response.status}`);
                }
                const result = yield response.json();
                if (result.status === "success") {
                    return result.state || null;
                }
                else {
                    throw new Error(result.error || "Failed to get Terraform state");
                }
            }
            catch (error) {
                throw new Error(`Failed to get state: ${error.message}`);
            }
        });
    }
    /**
     * Get comprehensive infrastructure status for a project
     */
    static getInfrastructureStatus(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get project details
                const { getProjectById } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                const project = yield getProjectById(projectId);
                if (!project) {
                    throw new Error("Project not found");
                }
                // Get Terraform state to validate actual deployment status
                let terraformState = null;
                let actualDeploymentStatus = project.deploymentStatus || "not_deployed";
                try {
                    terraformState = yield this.getTerraformState(projectId);
                    // Only validate deployment status if we can successfully get Terraform state
                    if (project.deploymentStatus === 'deployed' && terraformState) {
                        if (!terraformState.resources || terraformState.resources.length === 0) {
                            // Project claims to be deployed but has no resources in state
                            console.warn(`Project ${projectId} claims to be deployed but has no resources in Terraform state. Correcting status.`);
                            actualDeploymentStatus = "not_deployed";
                            // Update the project status to reflect reality
                            project.deploymentStatus = "not_deployed";
                            const { saveProject } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                            yield saveProject(project);
                        }
                    }
                }
                catch (stateError) {
                    console.warn(`Could not retrieve Terraform state for project ${projectId}:`, stateError);
                    // Don't override deployment status just because we can't get state
                    // The project's deploymentStatus should be trusted unless we have clear evidence it's wrong
                    // Only mark as failed if we have explicit evidence of failure
                    if (project.deploymentStatus === 'deployed') {
                        // Keep the deployed status - don't override based on state retrieval failure
                        actualDeploymentStatus = "deployed";
                    }
                }
                return {
                    projectId,
                    deploymentStatus: actualDeploymentStatus,
                    deploymentJobId: project.deploymentJobId,
                    deploymentOutputs: project.deploymentOutputs,
                    terraformState,
                    lastUpdated: project.updatedAt || project.createdAt
                };
            }
            catch (error) {
                throw new Error(`Failed to get infrastructure status: ${error.message}`);
            }
        });
    }
    /**
     * Validate Terraform configuration
     */
    static validateTerraformConfig(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get project details from store
                const { getProjectById } = yield Promise.resolve().then(() => __importStar(require("../utils/projectFileStore")));
                const project = yield getProjectById(projectId);
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
                const errors = [];
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
            }
            catch (error) {
                return {
                    valid: false,
                    errors: [`Validation error: ${error.message}`]
                };
            }
        });
    }
    /**
     * Get estimated costs for infrastructure
     */
    static estimateCosts(projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const terraformState = yield this.getTerraformState(projectId);
                if (!terraformState || !terraformState.resources) {
                    return {
                        estimated: false,
                        costs: {},
                        message: "No infrastructure deployed to estimate costs"
                    };
                }
                // Simple cost estimation based on resource types
                const costs = {
                    compute: 0,
                    storage: 0,
                    networking: 0,
                    database: 0,
                    total: 0
                };
                const resourceCounts = {};
                terraformState.resources.forEach((resource) => {
                    const resourceType = resource.type;
                    resourceCounts[resourceType] = (resourceCounts[resourceType] || 0) + 1;
                });
                // Rough monthly cost estimates (these are very approximate)
                const costEstimates = {
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
                    }
                    else if (resourceType.includes('s3') || resourceType.includes('bucket')) {
                        costs.storage += totalCost;
                    }
                    else if (resourceType.includes('api_gateway') || resourceType.includes('cloudfront')) {
                        costs.networking += totalCost;
                    }
                    else if (resourceType.includes('rds') || resourceType.includes('dynamodb') || resourceType.includes('elasticache')) {
                        costs.database += totalCost;
                    }
                });
                return {
                    estimated: true,
                    costs: Object.assign(Object.assign({}, costs), { resourceCounts, currency: "USD", period: "monthly" }),
                    message: "Cost estimation completed"
                };
            }
            catch (error) {
                return {
                    estimated: false,
                    costs: {},
                    message: `Failed to estimate costs: ${error.message}`
                };
            }
        });
    }
    /**
     * Save IaC code to file
     */
    static saveIaCToFile(projectId, iacCode) {
        const workspaceDir = path_1.default.join(process.cwd(), "terraform-runner/workspace", projectId);
        if (!fs_1.default.existsSync(workspaceDir)) {
            fs_1.default.mkdirSync(workspaceDir, { recursive: true });
        }
        const filePath = path_1.default.join(workspaceDir, "terraform.tf");
        fs_1.default.writeFileSync(filePath, iacCode);
        return workspaceDir;
    }
}
exports.InfrastructureService = InfrastructureService;
InfrastructureService.TERRAFORM_RUNNER_URL = "http://localhost:8000";
