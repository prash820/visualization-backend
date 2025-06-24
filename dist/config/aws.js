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
exports.awsCredentialManager = exports.AWSCredentialManager = void 0;
const client_sts_1 = require("@aws-sdk/client-sts");
class AWSCredentialManager {
    constructor() {
        this.cachedCredentials = new Map();
        this.stsClient = new client_sts_1.STSClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
    }
    getCredentialsForUser(userId, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `${userId}-${projectId}`;
            // Check cache first (with expiration)
            if (this.cachedCredentials.has(cacheKey)) {
                const cached = this.cachedCredentials.get(cacheKey);
                if (cached.expiration > Date.now()) {
                    console.log(`[AWS] Using cached credentials for user ${userId}, project ${projectId}`);
                    return cached.credentials;
                }
                else {
                    // Remove expired credentials
                    this.cachedCredentials.delete(cacheKey);
                }
            }
            try {
                console.log(`[AWS] Assuming role for user ${userId}, project ${projectId}`);
                // Validate required environment variables
                if (!process.env.AWS_ROLE_ARN) {
                    throw new Error("AWS_ROLE_ARN environment variable is required");
                }
                if (!process.env.AWS_EXTERNAL_ID) {
                    throw new Error("AWS_EXTERNAL_ID environment variable is required");
                }
                // Assume role with user-specific session
                const assumeRoleParams = {
                    RoleArn: process.env.AWS_ROLE_ARN,
                    RoleSessionName: `chart-app-${userId}-${projectId}`,
                    ExternalId: process.env.AWS_EXTERNAL_ID,
                    DurationSeconds: 3600, // 1 hour
                    Tags: [
                        { Key: 'UserId', Value: userId },
                        { Key: 'ProjectId', Value: projectId },
                        { Key: 'ManagedBy', Value: 'chart-app-platform' },
                        { Key: 'Environment', Value: process.env.NODE_ENV || 'development' },
                        { Key: 'CreatedAt', Value: new Date().toISOString() }
                    ]
                };
                const command = new client_sts_1.AssumeRoleCommand(assumeRoleParams);
                const response = yield this.stsClient.send(command);
                if (!response.Credentials) {
                    throw new Error("Failed to assume AWS role - no credentials returned");
                }
                const credentials = {
                    accessKeyId: response.Credentials.AccessKeyId,
                    secretAccessKey: response.Credentials.SecretAccessKey,
                    sessionToken: response.Credentials.SessionToken
                };
                // Cache credentials (expire 10 minutes before actual expiration for safety)
                const expirationTime = response.Credentials.Expiration
                    ? response.Credentials.Expiration.getTime() - (10 * 60 * 1000)
                    : Date.now() + (50 * 60 * 1000); // 50 minutes default
                this.cachedCredentials.set(cacheKey, {
                    credentials,
                    expiration: expirationTime
                });
                console.log(`[AWS] Successfully assumed role for user ${userId}, expires at ${new Date(expirationTime)}`);
                return credentials;
            }
            catch (error) {
                console.error(`[AWS] Failed to assume role for user ${userId}:`, error);
                throw new Error(`AWS role assumption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get AWS credentials with fallback for local development
     * Supports both direct credentials and IAM role assumption
     */
    getCredentials(userId, projectId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if we should use direct credentials
            const hasDirectCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
            const hasRoleConfig = process.env.AWS_ROLE_ARN && process.env.AWS_EXTERNAL_ID;
            // Log the credential approach being used
            if (hasDirectCredentials && !hasRoleConfig) {
                console.log("[AWS] Using direct AWS credentials (Access Key/Secret)");
                return {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    sessionToken: process.env.AWS_SESSION_TOKEN // Optional
                };
            }
            // If we have role configuration, use role assumption
            if (hasRoleConfig) {
                if (!userId || !projectId) {
                    if (process.env.NODE_ENV === 'production') {
                        throw new Error("userId and projectId are required for IAM role assumption in production");
                    }
                    // In development, we can proceed without user context for testing
                    console.log("[AWS] Warning: Using role assumption without user context (development only)");
                    return this.getCredentialsForUser('dev-user', 'dev-project');
                }
                console.log(`[AWS] Using IAM role assumption for user ${userId}, project ${projectId}`);
                return this.getCredentialsForUser(userId, projectId);
            }
            // If we have both, prefer role assumption in production
            if (hasDirectCredentials && hasRoleConfig) {
                if (process.env.NODE_ENV === 'production') {
                    console.log("[AWS] Both credential types available, using IAM role assumption for production");
                    if (!userId || !projectId) {
                        throw new Error("userId and projectId are required for IAM role assumption in production");
                    }
                    return this.getCredentialsForUser(userId, projectId);
                }
                else {
                    console.log("[AWS] Both credential types available, using direct credentials for development");
                    return {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                        sessionToken: process.env.AWS_SESSION_TOKEN
                    };
                }
            }
            // No valid credentials found
            throw new Error("No valid AWS credentials found. Please set either:\n" +
                "1. Direct credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n" +
                "2. Role assumption: AWS_ROLE_ARN and AWS_EXTERNAL_ID");
        });
    }
    /**
     * Clear cached credentials for a user (useful for logout)
     */
    clearUserCredentials(userId, projectId) {
        if (projectId) {
            const cacheKey = `${userId}-${projectId}`;
            this.cachedCredentials.delete(cacheKey);
        }
        else {
            // Clear all credentials for the user
            for (const [key] of this.cachedCredentials) {
                if (key.startsWith(`${userId}-`)) {
                    this.cachedCredentials.delete(key);
                }
            }
        }
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        for (const [, cached] of this.cachedCredentials) {
            if (cached.expiration > now) {
                validEntries++;
            }
            else {
                expiredEntries++;
            }
        }
        return {
            totalEntries: this.cachedCredentials.size,
            validEntries,
            expiredEntries
        };
    }
    /**
     * Clean up expired credentials
     */
    cleanupExpiredCredentials() {
        const now = Date.now();
        const keysToDelete = [];
        for (const [key, cached] of this.cachedCredentials) {
            if (cached.expiration <= now) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cachedCredentials.delete(key));
        if (keysToDelete.length > 0) {
            console.log(`[AWS] Cleaned up ${keysToDelete.length} expired credential entries`);
        }
        return keysToDelete.length;
    }
}
exports.AWSCredentialManager = AWSCredentialManager;
// Singleton instance
exports.awsCredentialManager = new AWSCredentialManager();
// Clean up expired credentials every 30 minutes
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        exports.awsCredentialManager.cleanupExpiredCredentials();
    }, 30 * 60 * 1000);
}
