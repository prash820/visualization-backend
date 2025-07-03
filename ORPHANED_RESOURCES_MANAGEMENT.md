# Orphaned Resources Management

## Problem Solved

The Magic App Builder and other workspace-based tools can sometimes fail during app creation due to various issues (network timeouts, parsing errors, etc.), but AWS resources may still be created successfully. This results in "orphaned" or "blackholed" resources that:

- ✅ **Exist in AWS** and are running/costing money
- ❌ **Not tracked** by the application
- ❌ **Not accessible** through the normal UI
- ❌ **Will accumulate costs** if not cleaned up

## Error Example

```
❌ App creation failed for job build-1751567796057-kypz3j: TypeError: Cannot read properties of undefined (reading 's3_website_url')
    at /Users/.../magicController.ts:904:31
```

**Result**: AWS resources created successfully, but app creation marked as "failed" due to response parsing error.

## Solution Overview

This system provides comprehensive tools to:

1. **Detect** orphaned resources across ALL workspace types (magic, test, uuid, etc.)
2. **Analyze** resource types, costs, and age  
3. **Clean up** individual or bulk orphaned resources
4. **Prevent** future orphaning with better error handling

## 🆕 Expanded Coverage

The system now handles ALL workspace types:
- **Magic workspaces** (`magic-*`) - Magic App Builder projects
- **Test workspaces** (`test-project-*`) - Test/development projects  
- **UUID workspaces** (`[uuid]`) - General workspace projects
- **Any other workspace** - Future workspace types

## 📊 Detection Categories

### 1. **Resource Workspaces** 🚨
- Have Terraform state with actual AWS resources
- **URGENT**: These are costing money!
- Need immediate cleanup

### 2. **Empty State Workspaces** 📁
- Have Terraform state files but 0 resources
- Safe to clean up
- Usually failed deployments

### 3. **No State Workspaces** 📂
- Directories without Terraform state
- Safe to clean up
- Usually incomplete/cancelled deployments

## 🔧 Tools & Endpoints

### 1. Management Script (Recommended)

```bash
# Make script executable (one time setup)
chmod +x ./manage-orphaned-resources.sh

# List all orphaned resources
./manage-orphaned-resources.sh list

# Get detailed information about a workspace
./manage-orphaned-resources.sh details magic-1234567890

# Clean up a specific orphaned resource
./manage-orphaned-resources.sh cleanup magic-1234567890

# Clean up ALL orphaned resources (dangerous!)
./manage-orphaned-resources.sh cleanup-all
```

### 2. API Endpoints

```bash
# List orphaned resources
GET /api/magic/orphaned-resources

# Get workspace details  
GET /api/magic/workspace/{projectId}

# Clean up specific resource
DELETE /api/magic/cleanup/{projectId}

# Clean up all resources (requires confirmation)
POST /api/magic/cleanup-all
```

### 3. Manual Commands

```bash
# Check for orphaned workspaces
find visualization-backend/terraform-runner/workspace -name "magic-*" -type d

# Check if workspace has terraform state (indicating AWS resources)
ls -la visualization-backend/terraform-runner/workspace/magic-1234567890/terraform.tfstate

# Manual terraform destroy
cd visualization-backend/terraform-runner/workspace/magic-1234567890
terraform destroy -auto-approve
```

## 📊 Detection & Analysis

### How Orphaned Resources Are Detected

1. **Scan workspace directories** for folders starting with `magic-`
2. **Check for terraform state file** (`terraform.tfstate`)
3. **Parse state file** to count actual AWS resources
4. **Fetch terraform outputs** to get URLs and resource info
5. **Calculate age and costs** based on creation time

### Resource Information Provided

```json
{
  "projectId": "magic-1751567813840",
  "createdAt": "2025-07-03T18:39:54.762Z",
  "ageInHours": 2.5,
  "resourceCount": 19,
  "resourceTypes": {
    "aws_s3_bucket": 1,
    "aws_lambda_function": 1,
    "aws_api_gateway_rest_api": 1,
    "aws_iam_role": 1,
    "aws_api_gateway_deployment": 1
  },
  "outputs": {
    "s3_website_url": "http://app-bucket.s3-website-us-east-1.amazonaws.com",
    "api_gateway_url": "https://xyz123.execute-api.us-east-1.amazonaws.com/prod"
  },
  "stateFileSize": "27KB"
}
```

## 🧹 Cleanup Operations

### Individual Resource Cleanup

**Safe and Recommended**

```bash
./manage-orphaned-resources.sh cleanup magic-1234567890
```

**What happens:**
1. Validates project ID format
2. Checks if workspace exists
3. Calls `terraform destroy` via API
4. Removes workspace directory
5. Confirms cleanup success

### Bulk Cleanup (Dangerous)

**Use with extreme caution!**

```bash
./manage-orphaned-resources.sh cleanup-all
```

**Safety measures:**
- Shows list of resources that will be destroyed
- Requires typing exact confirmation: `YES_DESTROY_ALL_ORPHANED_RESOURCES`
- Processes each workspace individually
- Reports success/failure for each
- Cannot be undone

## 🛠️ Error Handling Improvements

### Fixed Parsing Issues

The original error was caused by undefined `infraOutputs`. The solution includes:

```typescript
// Safely handle infraOutputs which might be undefined or malformed
let appUrl = '';
let apiUrl = '';
let adminUrl = '';

try {
  if (infraOutputs && typeof infraOutputs === 'object') {
    // Try multiple possible output names
    appUrl = infraOutputs.s3_website_url || 
             infraOutputs.website_url ||
             (infraOutputs.s3_bucket_name ? 
               `http://${infraOutputs.s3_bucket_name}.s3-website-us-east-1.amazonaws.com` : '');
    
    // Fallback to direct terraform outputs
    if (!appUrl || !apiUrl) {
      const outputsResult = await getTerraformOutputs(projectId);
      // Use direct outputs...
    }
  }
} catch (error) {
  // Create AWS console fallback URLs
  appUrl = `https://console.aws.amazon.com/s3/home?region=us-east-1#/search?prefix=${projectId}`;
  // etc...
}
```

### Prevention Measures

1. **Better error handling** in app creation flow
2. **Fallback URL generation** when outputs are missing
3. **Comprehensive logging** for debugging
4. **Graceful degradation** instead of hard failures

## 💰 Cost Management

### Estimated Costs per Resource Type

Common Magic App resources and approximate monthly costs:

- **aws_lambda_function**: ~$5/month (minimal usage)
- **aws_s3_bucket**: ~$10/month (small website)
- **aws_api_gateway_rest_api**: ~$5/month (minimal usage)
- **aws_iam_role**: Free
- **aws_dynamodb_table**: ~$25/month (if used)

**Total per orphaned app**: ~$20-50/month depending on complexity

### Cleanup Urgency

- **Age < 1 hour**: Normal development testing
- **Age 1-24 hours**: Should investigate/cleanup  
- **Age > 24 hours**: Definitely orphaned, cleanup immediately
- **Age > 7 days**: Significant cost accumulation

## 🚨 Best Practices

### Development

1. **Monitor orphaned resources daily** during active development
2. **Clean up after testing** Magic App Builder
3. **Use the management script** rather than manual cleanup
4. **Check costs regularly** in AWS console

### Production

1. **Set up monitoring alerts** for unexpected AWS costs
2. **Run automated cleanup** for resources older than 24 hours
3. **Log all cleanup operations** for audit trail
4. **Test error scenarios** to prevent new orphaning patterns

### Safety

1. **Always list before cleanup** to see what will be destroyed
2. **Clean up individually** unless you're sure about bulk operations
3. **Verify in AWS console** that resources are actually deleted
4. **Keep logs** of cleanup operations

## 📋 Troubleshooting

### Common Issues

**Problem**: Terraform destroy fails
```bash
# Check terraform state manually
cd workspace/magic-1234567890
terraform plan
terraform state list
```

**Problem**: Workspace exists but no state file
```bash
# Safe to remove directory
rm -rf workspace/magic-1234567890
```

**Problem**: AWS resources still exist after cleanup
```bash
# Check AWS console manually
# Resources may need manual deletion
```

### Manual AWS Cleanup

If automated cleanup fails, manually delete in AWS Console:

1. **Lambda Functions**: Delete function and associated IAM role
2. **API Gateway**: Delete REST API
3. **S3 Buckets**: Empty bucket, then delete bucket and policies
4. **CloudFormation**: Check for any created stacks

### Verification Commands

```bash
# Verify no orphaned resources
./manage-orphaned-resources.sh list

# Check AWS costs
aws ce get-cost-and-usage --time-period Start=2025-07-01,End=2025-07-04 --granularity DAILY --metrics BlendedCost

# Check terraform workspaces
find visualization-backend/terraform-runner/workspace -name "terraform.tfstate" -exec ls -la {} \;
```

## 🔄 Integration with Magic App Builder

### Automatic Detection

The system automatically detects orphaned resources by:
- Scanning all `magic-*` directories in workspace
- Checking terraform state files for actual resources
- Differentiating between failed deploys and successful deploys with parsing errors

### UI Integration Potential

Future enhancements could include:
- Dashboard showing orphaned resources count
- One-click cleanup buttons in admin panel  
- Cost estimation and alerts
- Automatic cleanup schedules

### Monitoring Integration

Consider integrating with:
- AWS CloudWatch for cost alerts
- Terraform state backends for centralized tracking
- Log aggregation for cleanup audit trails

## 📄 Example Output

### Successful Detection
```json
{
  "orphanedResources": [
    {
      "projectId": "magic-1751567813840",
      "createdAt": "2025-07-03T18:39:54.762Z", 
      "ageInHours": 2.5,
      "resourceCount": 19,
      "resourceTypes": {
        "aws_s3_bucket": 1,
        "aws_lambda_function": 1,
        "aws_api_gateway_rest_api": 1
      },
      "outputs": {
        "s3_website_url": "http://bucket.s3-website-us-east-1.amazonaws.com",
        "api_gateway_url": "https://xyz.execute-api.us-east-1.amazonaws.com/prod"
      }
    }
  ],
  "total": 1,
  "message": "Found 1 orphaned workspaces with AWS resources"
}
```

### Successful Cleanup
```json
{
  "message": "Orphaned resources successfully cleaned up",
  "projectId": "magic-1751567813840", 
  "action": "terraform_destroyed",
  "logs": "Destroy complete! Resources: 17 destroyed."
}
```

This comprehensive system ensures that no AWS resources are left orphaned and accumulating costs, while providing safe and easy cleanup mechanisms. 