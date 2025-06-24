import { STSClient, AssumeRoleCommand, AssumeRoleCommandInput } from "@aws-sdk/client-sts";

interface CachedCredentials {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  expiration: number;
}

export class AWSCredentialManager {
  private stsClient: STSClient;
  private cachedCredentials: Map<string, CachedCredentials> = new Map();

  constructor() {
    this.stsClient = new STSClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async getCredentialsForUser(userId: string, projectId: string) {
    const cacheKey = `${userId}-${projectId}`;
    
    // Check cache first (with expiration)
    if (this.cachedCredentials.has(cacheKey)) {
      const cached = this.cachedCredentials.get(cacheKey)!;
      if (cached.expiration > Date.now()) {
        console.log(`[AWS] Using cached credentials for user ${userId}, project ${projectId}`);
        return cached.credentials;
      } else {
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
      const assumeRoleParams: AssumeRoleCommandInput = {
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

      const command = new AssumeRoleCommand(assumeRoleParams);
      const response = await this.stsClient.send(command);
      
      if (!response.Credentials) {
        throw new Error("Failed to assume AWS role - no credentials returned");
      }

      const credentials = {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!
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

    } catch (error) {
      console.error(`[AWS] Failed to assume role for user ${userId}:`, error);
      throw new Error(`AWS role assumption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AWS credentials with fallback for local development
   */
  async getCredentials(userId?: string, projectId?: string) {
    // In production, always use role assumption
    if (process.env.NODE_ENV === 'production') {
      if (!userId || !projectId) {
        throw new Error("userId and projectId are required in production");
      }
      return this.getCredentialsForUser(userId, projectId);
    }

    // In development, check if we should use role assumption or local credentials
    if (process.env.AWS_ROLE_ARN && userId && projectId) {
      return this.getCredentialsForUser(userId, projectId);
    }

    // Fall back to default AWS credentials (for local development)
    console.log("[AWS] Using default AWS credentials for local development");
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      sessionToken: process.env.AWS_SESSION_TOKEN
    };
  }

  /**
   * Clear cached credentials for a user (useful for logout)
   */
  clearUserCredentials(userId: string, projectId?: string) {
    if (projectId) {
      const cacheKey = `${userId}-${projectId}`;
      this.cachedCredentials.delete(cacheKey);
    } else {
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
      } else {
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
    const keysToDelete: string[] = [];

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

// Singleton instance
export const awsCredentialManager = new AWSCredentialManager();

// Clean up expired credentials every 30 minutes
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    awsCredentialManager.cleanupExpiredCredentials();
  }, 30 * 60 * 1000);
} 