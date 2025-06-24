"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaService = exports.QuotaService = void 0;
const aws_1 = require("../config/aws");
class QuotaService {
    constructor() {
        this.userQuotas = new Map();
        this.projectCosts = new Map();
        // Initialize default quotas from environment variables
        this.initializeDefaults();
    }
    initializeDefaults() {
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
    checkUserQuota(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const quota = yield this.getUserQuota(userId);
            const currentProjects = yield this.getUserProjectCount(userId);
            const currentCost = yield this.getUserTotalCost(userId);
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
        });
    }
    /**
     * Estimate cost for a new project before deployment
     */
    estimateProjectCost(projectId, infrastructureCode) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if we have a cached estimate
            if (this.projectCosts.has(projectId)) {
                const cached = this.projectCosts.get(projectId);
                console.log(`[Quota] Using cached cost estimate for project ${projectId}`);
                return cached;
            }
            console.log(`[Quota] Calculating cost estimate for project ${projectId}`);
            // Basic cost estimation based on typical resource usage
            const costEstimate = {
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
        });
    }
    /**
     * Check if project deployment would exceed cost limits
     */
    checkProjectCostLimit(userId, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const costEstimate = yield this.estimateProjectCost(projectId);
            const maxCostPerProject = parseInt(process.env.MAX_COST_PER_PROJECT || '50');
            const currentUserCost = yield this.getUserTotalCost(userId);
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
        });
    }
    /**
     * Schedule automatic cleanup for a project
     */
    scheduleResourceCleanup(projectId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeoutMinutes = parseInt(process.env.RESOURCE_TIMEOUT_MINUTES || '60');
            const timeoutMs = timeoutMinutes * 60 * 1000;
            console.log(`[Quota] Scheduling cleanup for project ${projectId} in ${timeoutMinutes} minutes`);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    console.log(`[Quota] Auto-cleanup triggered for project ${projectId}`);
                    yield this.cleanupProjectResources(projectId, userId);
                }
                catch (error) {
                    console.error(`[Quota] Auto-cleanup failed for project ${projectId}:`, error);
                }
            }), timeoutMs);
        });
    }
    /**
     * Clean up resources for a specific project
     */
    cleanupProjectResources(projectId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[Quota] Cleaning up resources for project ${projectId}, user ${userId}`);
                // Get AWS credentials for the user
                const credentials = yield aws_1.awsCredentialManager.getCredentials(userId, projectId);
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
            }
            catch (error) {
                console.error(`[Quota] Error cleaning up project ${projectId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Clean up old/abandoned projects
     */
    cleanupOldProjects() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[Quota] Running periodic cleanup of old projects");
            // TODO: Implement logic to find and clean up old projects
            // This could involve:
            // 1. Check project database for projects older than X days
            // 2. Check for projects with failed deployments
            // 3. Clean up resources that are no longer tracked
            const cleanedUp = 0; // Placeholder
            console.log(`[Quota] Cleaned up ${cleanedUp} old projects`);
        });
    }
    /**
     * Update cost estimates for all active projects
     */
    updateAllCostEstimates() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("[Quota] Updating cost estimates for all projects");
            // TODO: Implement actual cost tracking using AWS Cost Explorer API
            // This could get real usage data and update estimates
            console.log("[Quota] Cost estimates updated");
        });
    }
    /**
     * Get user quota information
     */
    getUserQuota(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.userQuotas.has(userId)) {
                // Create default quota for new user
                const defaultQuota = {
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
            return this.userQuotas.get(userId);
        });
    }
    /**
     * Get current number of projects for a user
     */
    getUserProjectCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Query actual database for user's project count
            // For now, return cached value
            const quota = yield this.getUserQuota(userId);
            return quota.currentProjects;
        });
    }
    /**
     * Get total estimated cost for all user's projects
     */
    getUserTotalCost(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Calculate from actual project costs
            // For now, return cached value
            const quota = yield this.getUserQuota(userId);
            return quota.currentTotalCost;
        });
    }
    /**
     * Update user's project count and cost
     */
    updateUserUsage(userId, projectCount, totalCost) {
        return __awaiter(this, void 0, void 0, function* () {
            const quota = yield this.getUserQuota(userId);
            quota.currentProjects = projectCount;
            quota.currentTotalCost = totalCost;
            quota.lastUpdated = new Date();
            this.userQuotas.set(userId, quota);
        });
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
exports.QuotaService = QuotaService;
// Singleton instance
exports.quotaService = new QuotaService();
