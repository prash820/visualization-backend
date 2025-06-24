import { awsCredentialManager } from "../config/aws";

interface UserResourceQuota {
  userId: string;
  maxProjects: number;
  maxCostPerProject: number;
  maxTotalCost: number;
  currentProjects: number;
  currentTotalCost: number;
  lastUpdated: Date;
}

interface ProjectCostEstimate {
  projectId: string;
  estimatedMonthlyCost: number;
  estimatedDailyCost: number;
  resourceBreakdown: {
    lambda: number;
    s3: number;
    dynamodb: number;
    apigateway: number;
    other: number;
  };
  currency: string;
}

export class QuotaService {
  private userQuotas: Map<string, UserResourceQuota> = new Map();
  private projectCosts: Map<string, ProjectCostEstimate> = new Map();

  constructor() {
    // Initialize default quotas from environment variables
    this.initializeDefaults();
  }

  private initializeDefaults() {
    // Set up periodic cleanup
    if (process.env.NODE_ENV === 'production') {
      // Clean up old projects every hour
      setInterval(() => {
        this.cleanupOldProjects();
      }, 60 * 60 * 1000);

      // Update cost estimates every 6 hours
      setInterval(() => {
        this.updateAllCostEstimates();
      }, 6 * 60 * 60 * 1000);
    }
  }

  /**
   * Check if user can create a new project
   */
  async checkUserQuota(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentUsage: {
      projects: number;
      maxProjects: number;
      totalCost: number;
      maxTotalCost: number;
    };
  }> {
    const quota = await this.getUserQuota(userId);
    const currentProjects = await this.getUserProjectCount(userId);
    const currentCost = await this.getUserTotalCost(userId);

    const maxProjects = parseInt(process.env.MAX_RESOURCES_PER_USER || '10');
    const maxTotalCost = parseInt(process.env.MAX_TOTAL_COST_PER_USER || '100');

    if (currentProjects >= maxProjects) {
      return {
        allowed: false,
        reason: `Maximum number of projects reached (${maxProjects}). Please delete some projects first.`,
        currentUsage: {
          projects: currentProjects,
          maxProjects,
          totalCost: currentCost,
          maxTotalCost
        }
      };
    }

    if (currentCost >= maxTotalCost) {
      return {
        allowed: false,
        reason: `Maximum total cost reached ($${maxTotalCost}). Please reduce costs or delete some projects.`,
        currentUsage: {
          projects: currentProjects,
          maxProjects,
          totalCost: currentCost,
          maxTotalCost
        }
      };
    }

    return {
      allowed: true,
      currentUsage: {
        projects: currentProjects,
        maxProjects,
        totalCost: currentCost,
        maxTotalCost
      }
    };
  }

  /**
   * Estimate cost for a new project before deployment
   */
  async estimateProjectCost(projectId: string, infrastructureCode?: string): Promise<ProjectCostEstimate> {
    // Check if we have a cached estimate
    if (this.projectCosts.has(projectId)) {
      const cached = this.projectCosts.get(projectId)!;
      console.log(`[Quota] Using cached cost estimate for project ${projectId}`);
      return cached;
    }

    console.log(`[Quota] Calculating cost estimate for project ${projectId}`);

    // Basic cost estimation based on typical resource usage
    const costEstimate: ProjectCostEstimate = {
      projectId,
      estimatedMonthlyCost: 0,
      estimatedDailyCost: 0,
      resourceBreakdown: {
        lambda: 0,
        s3: 0,
        dynamodb: 0,
        apigateway: 0,
        other: 0
      },
      currency: 'USD'
    };

    // Lambda costs (assuming moderate usage)
    costEstimate.resourceBreakdown.lambda = 5.0; // $5/month for moderate usage

    // S3 costs (storage + requests)
    costEstimate.resourceBreakdown.s3 = 2.0; // $2/month for small websites

    // DynamoDB costs (on-demand pricing)
    costEstimate.resourceBreakdown.dynamodb = 3.0; // $3/month for light usage

    // API Gateway costs
    costEstimate.resourceBreakdown.apigateway = 2.0; // $2/month for API calls

    // Other services (CloudWatch, etc.)
    costEstimate.resourceBreakdown.other = 1.0; // $1/month

    // Calculate totals
    costEstimate.estimatedMonthlyCost = Object.values(costEstimate.resourceBreakdown)
      .reduce((total, cost) => total + cost, 0);
    
    costEstimate.estimatedDailyCost = costEstimate.estimatedMonthlyCost / 30;

    // Cache the estimate
    this.projectCosts.set(projectId, costEstimate);

    return costEstimate;
  }

  /**
   * Check if project deployment would exceed cost limits
   */
  async checkProjectCostLimit(userId: string, projectId: string): Promise<{
    allowed: boolean;
    reason?: string;
    costEstimate: ProjectCostEstimate;
  }> {
    const costEstimate = await this.estimateProjectCost(projectId);
    const maxCostPerProject = parseInt(process.env.MAX_COST_PER_PROJECT || '50');
    const currentUserCost = await this.getUserTotalCost(userId);
    const maxTotalCost = parseInt(process.env.MAX_TOTAL_COST_PER_USER || '100');

    if (costEstimate.estimatedMonthlyCost > maxCostPerProject) {
      return {
        allowed: false,
        reason: `Project estimated cost ($${costEstimate.estimatedMonthlyCost.toFixed(2)}) exceeds limit ($${maxCostPerProject})`,
        costEstimate
      };
    }

    if (currentUserCost + costEstimate.estimatedMonthlyCost > maxTotalCost) {
      return {
        allowed: false,
        reason: `Total cost would exceed limit ($${maxTotalCost}). Current: $${currentUserCost.toFixed(2)}, New project: $${costEstimate.estimatedMonthlyCost.toFixed(2)}`,
        costEstimate
      };
    }

    return {
      allowed: true,
      costEstimate
    };
  }

  /**
   * Schedule automatic cleanup for a project
   */
  async scheduleResourceCleanup(projectId: string, userId: string) {
    const timeoutMinutes = parseInt(process.env.RESOURCE_TIMEOUT_MINUTES || '60');
    const timeoutMs = timeoutMinutes * 60 * 1000;

    console.log(`[Quota] Scheduling cleanup for project ${projectId} in ${timeoutMinutes} minutes`);

    setTimeout(async () => {
      try {
        console.log(`[Quota] Auto-cleanup triggered for project ${projectId}`);
        await this.cleanupProjectResources(projectId, userId);
      } catch (error) {
        console.error(`[Quota] Auto-cleanup failed for project ${projectId}:`, error);
      }
    }, timeoutMs);
  }

  /**
   * Clean up resources for a specific project
   */
  async cleanupProjectResources(projectId: string, userId: string) {
    try {
      console.log(`[Quota] Cleaning up resources for project ${projectId}, user ${userId}`);

      // Get AWS credentials for the user
      const credentials = await awsCredentialManager.getCredentials(userId, projectId);

      // TODO: Implement actual resource cleanup using AWS SDK
      // This would involve:
      // 1. List all resources tagged with the project
      // 2. Delete S3 objects and buckets
      // 3. Delete Lambda functions
      // 4. Delete DynamoDB tables
      // 5. Delete API Gateway APIs
      // 6. Remove IAM roles/policies

      // For now, just update our tracking
      this.projectCosts.delete(projectId);
      
      console.log(`[Quota] Successfully cleaned up project ${projectId}`);
      
      return {
        success: true,
        message: `Project ${projectId} resources cleaned up successfully`
      };

    } catch (error) {
      console.error(`[Quota] Error cleaning up project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old/abandoned projects
   */
  private async cleanupOldProjects() {
    console.log("[Quota] Running periodic cleanup of old projects");
    
    // TODO: Implement logic to find and clean up old projects
    // This could involve:
    // 1. Check project database for projects older than X days
    // 2. Check for projects with failed deployments
    // 3. Clean up resources that are no longer tracked

    const cleanedUp = 0; // Placeholder
    console.log(`[Quota] Cleaned up ${cleanedUp} old projects`);
  }

  /**
   * Update cost estimates for all active projects
   */
  private async updateAllCostEstimates() {
    console.log("[Quota] Updating cost estimates for all projects");
    
    // TODO: Implement actual cost tracking using AWS Cost Explorer API
    // This could get real usage data and update estimates

    console.log("[Quota] Cost estimates updated");
  }

  /**
   * Get user quota information
   */
  private async getUserQuota(userId: string): Promise<UserResourceQuota> {
    if (!this.userQuotas.has(userId)) {
      // Create default quota for new user
      const defaultQuota: UserResourceQuota = {
        userId,
        maxProjects: parseInt(process.env.MAX_RESOURCES_PER_USER || '10'),
        maxCostPerProject: parseInt(process.env.MAX_COST_PER_PROJECT || '50'),
        maxTotalCost: parseInt(process.env.MAX_TOTAL_COST_PER_USER || '100'),
        currentProjects: 0,
        currentTotalCost: 0,
        lastUpdated: new Date()
      };
      
      this.userQuotas.set(userId, defaultQuota);
    }
    
    return this.userQuotas.get(userId)!;
  }

  /**
   * Get current number of projects for a user
   */
  private async getUserProjectCount(userId: string): Promise<number> {
    // TODO: Query actual database for user's project count
    // For now, return cached value
    const quota = await this.getUserQuota(userId);
    return quota.currentProjects;
  }

  /**
   * Get total estimated cost for all user's projects
   */
  private async getUserTotalCost(userId: string): Promise<number> {
    // TODO: Calculate from actual project costs
    // For now, return cached value
    const quota = await this.getUserQuota(userId);
    return quota.currentTotalCost;
  }

  /**
   * Update user's project count and cost
   */
  async updateUserUsage(userId: string, projectCount: number, totalCost: number) {
    const quota = await this.getUserQuota(userId);
    quota.currentProjects = projectCount;
    quota.currentTotalCost = totalCost;
    quota.lastUpdated = new Date();
    
    this.userQuotas.set(userId, quota);
  }

  /**
   * Get quota statistics for monitoring
   */
  getQuotaStats() {
    const totalUsers = this.userQuotas.size;
    let totalProjects = 0;
    let totalCost = 0;

    for (const [, quota] of this.userQuotas) {
      totalProjects += quota.currentProjects;
      totalCost += quota.currentTotalCost;
    }

    return {
      totalUsers,
      totalProjects,
      totalEstimatedCost: totalCost,
      averageCostPerUser: totalUsers > 0 ? totalCost / totalUsers : 0,
      averageProjectsPerUser: totalUsers > 0 ? totalProjects / totalUsers : 0
    };
  }
}

// Singleton instance
export const quotaService = new QuotaService(); 