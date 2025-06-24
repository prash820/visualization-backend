# Heroku Deployment Guide for Multi-Tenant AWS Provisioning

## 🚀 Production Deployment Architecture

**Important: All commands in this guide should be run from the `visualization-backend` directory.**

```bash
cd chart-app-fullstack/visualization-backend
```

### **1. AWS IAM Setup for Production**

#### **Step 1: Create a Dedicated AWS IAM Role for Heroku**

```bash
# Create IAM policy for infrastructure provisioning
aws iam create-policy \
    --policy-name ChartAppInfraProvisioningPolicy \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:*",
                    "lambda:*",
                    "apigateway:*",
                    "dynamodb:*",
                    "iam:CreateRole",
                    "iam:DeleteRole",
                    "iam:AttachRolePolicy",
                    "iam:DetachRolePolicy",
                    "iam:PutRolePolicy",
                    "iam:DeleteRolePolicy",
                    "iam:GetRole",
                    "iam:PassRole",
                    "iam:ListRolePolicies",
                    "iam:ListAttachedRolePolicies",
                    "ec2:DescribeVpcs",
                    "ec2:DescribeSubnets",
                    "ec2:DescribeSecurityGroups",
                    "logs:*",
                    "cloudformation:*",
                    "sts:GetCallerIdentity"
                ],
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "aws:RequestedRegion": ["us-east-1", "us-west-2"]
                    },
                    "StringLike": {
                        "aws:PrincipalTag/Project": "chart-app-*"
                    }
                }
            }
        ]
    }'

# Create IAM role that Heroku can assume
aws iam create-role \
    --role-name ChartAppHerokuRole \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
                },
                "Action": "sts:AssumeRole",
                "Condition": {
                    "StringEquals": {
                        "sts:ExternalId": "YOUR_EXTERNAL_ID_SECRET"
                    }
                }
            }
        ]
    }'

# Attach the policy to the role
aws iam attach-role-policy \
    --role-arn arn:aws:iam::YOUR_ACCOUNT_ID:role/ChartAppHerokuRole \
    --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/ChartAppInfraProvisioningPolicy
```

#### **Step 2: Resource Tagging Strategy for Multi-Tenancy**

```bash
# All resources will be tagged with:
# - Project: chart-app-{userId}-{projectId}
# - Environment: production
# - ManagedBy: chart-app-platform
# - UserId: {userId}
# - ProjectId: {projectId}
# - CreatedAt: {timestamp}
```

### **2. Heroku App Configuration**

#### **Environment Variables Setup**

```bash
# Set AWS credentials for role assumption
heroku config:set AWS_REGION=us-east-1
heroku config:set AWS_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/ChartAppHerokuRole
heroku config:set AWS_EXTERNAL_ID=YOUR_EXTERNAL_ID_SECRET
heroku config:set AWS_SESSION_NAME=chart-app-heroku-session

# Application configuration
heroku config:set NODE_ENV=production
heroku config:set PORT=5001
heroku config:set TERRAFORM_PORT=8000

# Database and other services
heroku config:set DATABASE_URL=your_postgres_url
heroku config:set OPENAI_API_KEY=your_openai_key

# Security
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set CORS_ORIGIN=https://your-frontend-domain.vercel.app

# Resource limits (for cost control)
heroku config:set MAX_RESOURCES_PER_USER=10
heroku config:set MAX_COST_PER_PROJECT=50
heroku config:set RESOURCE_TIMEOUT_MINUTES=60
```

### **3. Heroku Buildpacks Configuration**

```bash
# Add multiple buildpacks for Node.js and Python
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python

# Install Terraform in Heroku
heroku buildpacks:add https://github.com/HashiCorp/heroku-buildpack-terraform
```

### **4. Multi-Process Heroku Setup**

Create `Procfile`:
```
web: npm start
terraform: npm run start:terraform
```

The terraform process runs the Python FastAPI service from the `terraform-runner/` directory.

### **5. AWS Credential Management in Code**

#### **Update Backend AWS Configuration**

```typescript
// visualization-backend/src/config/aws.ts
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export class AWSCredentialManager {
  private stsClient: STSClient;
  private cachedCredentials: Map<string, any> = new Map();

  constructor() {
    this.stsClient = new STSClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async getCredentialsForUser(userId: string, projectId: string) {
    const cacheKey = `${userId}-${projectId}`;
    
    // Check cache first (with expiration)
    if (this.cachedCredentials.has(cacheKey)) {
      const cached = this.cachedCredentials.get(cacheKey);
      if (cached.expiration > Date.now()) {
        return cached.credentials;
      }
    }

    // Assume role with user-specific session
    const command = new AssumeRoleCommand({
      RoleArn: process.env.AWS_ROLE_ARN,
      RoleSessionName: `chart-app-${userId}-${projectId}`,
      ExternalId: process.env.AWS_EXTERNAL_ID,
      DurationSeconds: 3600, // 1 hour
      Tags: [
        { Key: 'UserId', Value: userId },
        { Key: 'ProjectId', Value: projectId },
        { Key: 'ManagedBy', Value: 'chart-app-platform' }
      ]
    });

    const response = await this.stsClient.send(command);
    
    const credentials = {
      accessKeyId: response.Credentials?.AccessKeyId,
      secretAccessKey: response.Credentials?.SecretAccessKey,
      sessionToken: response.Credentials?.SessionToken
    };

    // Cache credentials
    this.cachedCredentials.set(cacheKey, {
      credentials,
      expiration: Date.now() + (50 * 60 * 1000) // 50 minutes
    });

    return credentials;
  }
}
```

### **6. Cost Control and Resource Limits**

#### **Resource Quota Management**

```typescript
// visualization-backend/src/services/quotaService.ts
export class QuotaService {
  async checkUserQuota(userId: string): Promise<boolean> {
    const userResources = await this.getUserResources(userId);
    const maxResources = parseInt(process.env.MAX_RESOURCES_PER_USER || '10');
    
    return userResources.length < maxResources;
  }

  async estimateProjectCost(projectId: string): Promise<number> {
    // Calculate estimated monthly cost
    // Block deployment if exceeds MAX_COST_PER_PROJECT
  }

  async scheduleResourceCleanup(projectId: string, userId: string) {
    // Auto-cleanup resources after RESOURCE_TIMEOUT_MINUTES
    setTimeout(async () => {
      await this.cleanupProjectResources(projectId, userId);
    }, parseInt(process.env.RESOURCE_TIMEOUT_MINUTES || '60') * 60 * 1000);
  }
}
```

### **7. Deployment Commands**

```bash
# Deploy to Heroku from visualization-backend directory
git add .
git commit -m "Production deployment with multi-tenant AWS setup"
git push heroku HEAD:main

# Scale the services (web + terraform processes)
heroku ps:scale web=1 terraform=1

# Monitor logs
heroku logs --tail

# Check app status
heroku ps
```

### **8. Monitoring and Alerting**

```bash
# Add Heroku monitoring add-ons
heroku addons:create papertrail:choklad
heroku addons:create newrelic:wayne
heroku addons:create logdna:quaco

# Set up cost monitoring
heroku config:set AWS_COST_BUDGET_LIMIT=1000
heroku config:set ALERT_EMAIL=admin@yourapp.com
```

### **9. Security Best Practices**

#### **Environment Isolation**
- Each user's resources are tagged and isolated
- Role-based access with temporary credentials
- Resource quotas and cost limits
- Automated cleanup policies

#### **Secrets Management**
```bash
# Use Heroku's secure config vars
heroku config:set --app your-app SECRET_NAME=secret_value

# Rotate credentials regularly
heroku config:set AWS_EXTERNAL_ID=new_external_id
```

### **10. Scaling Considerations**

#### **For 100+ Users:**

1. **Database**: Use Heroku Postgres with connection pooling
2. **Redis**: Add Redis for job queuing and caching
3. **Worker Dynos**: Scale background job processing
4. **Load Balancing**: Multiple web dynos
5. **CDN**: CloudFront for static assets

```bash
# Scale for production load
heroku ps:scale web=3 terraform=1
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0
```

### **11. Frontend (Vercel) Configuration**

Update your Vercel environment variables:
```bash
# Vercel environment variables
NEXT_PUBLIC_API_URL=https://your-heroku-app.herokuapp.com/api
NEXT_PUBLIC_ENVIRONMENT=production
```

### **12. Monitoring Dashboard**

Create monitoring for:
- Active AWS resources per user
- Cost tracking per project
- API rate limiting
- Resource quota usage
- Failed deployments

This setup ensures secure, scalable, multi-tenant AWS provisioning while maintaining cost control and proper isolation between users. 