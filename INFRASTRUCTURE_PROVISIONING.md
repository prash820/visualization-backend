# Infrastructure Provisioning System

This document describes the comprehensive infrastructure provisioning system that allows you to deploy, monitor, and manage cloud infrastructure using Terraform.

## Overview

The infrastructure provisioning system provides:

- **Automated Infrastructure Deployment**: Deploy infrastructure using generated Terraform code
- **Job-based Processing**: Track deployment progress with job IDs
- **Infrastructure Monitoring**: Monitor deployment status and retrieve infrastructure details
- **Cost Estimation**: Estimate monthly costs for deployed infrastructure
- **Configuration Validation**: Validate Terraform configurations before deployment
- **Infrastructure Cleanup**: Safely destroy infrastructure when no longer needed

## Architecture

The system consists of:

1. **Node.js Backend**: Main API server handling requests and job management
2. **Python Terraform Runner**: FastAPI service that executes Terraform commands
3. **Job Management**: In-memory job tracking for deployment operations
4. **File Storage**: Terraform configurations stored in project-specific workspace

## API Endpoints

### Infrastructure Deployment

#### Deploy Infrastructure
```http
POST /api/deploy
Content-Type: application/json

{
  "projectId": "string",
  "iacCode": "string"
}
```

**Response:**
```json
{
  "jobId": "deploy-1234567890-abc123",
  "status": "accepted",
  "message": "Infrastructure deployment started"
}
```

#### Get Deployment Job Status
```http
GET /api/deploy/status/:jobId
```

**Response:**
```json
{
  "jobId": "deploy-1234567890-abc123",
  "status": "completed",
  "progress": 100,
  "result": {
    "message": "Infrastructure deployed successfully",
    "logs": "...",
    "outputs": { ... }
  },
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-01-01T00:05:00.000Z"
}
```

### Infrastructure Management

#### Get Infrastructure Status
```http
GET /api/deploy/infrastructure/:projectId
```

**Response:**
```json
{
  "projectId": "string",
  "deploymentStatus": "deployed",
  "deploymentJobId": "deploy-1234567890-abc123",
  "deploymentOutputs": { ... },
  "terraformState": { ... },
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

#### Destroy Infrastructure
```http
POST /api/deploy/destroy
Content-Type: application/json

{
  "projectId": "string"
}
```

**Response:**
```json
{
  "jobId": "destroy-1234567890-abc123",
  "status": "accepted",
  "message": "Infrastructure destruction started"
}
```

### Configuration and Analysis

#### Validate Terraform Configuration
```http
GET /api/deploy/validate/:projectId
```

**Response:**
```json
{
  "projectId": "string",
  "valid": true,
  "errors": [],
  "message": "Terraform configuration is valid"
}
```

#### Estimate Infrastructure Costs
```http
GET /api/deploy/costs/:projectId
```

**Response:**
```json
{
  "projectId": "string",
  "estimated": true,
  "costs": {
    "compute": 150,
    "storage": 30,
    "networking": 20,
    "database": 100,
    "total": 300,
    "resourceCounts": {
      "aws_instance": 3,
      "aws_s3_bucket": 2,
      "aws_rds_instance": 1
    },
    "currency": "USD",
    "period": "monthly"
  },
  "message": "Cost estimation completed"
}
```

#### Get Terraform Outputs
```http
GET /api/deploy/outputs/:projectId
```

**Response:**
```json
{
  "projectId": "string",
  "outputs": {
    "api_gateway_url": "https://abc123.execute-api.us-east-1.amazonaws.com/prod",
    "database_endpoint": "db.example.com:5432",
    "s3_bucket_name": "my-app-bucket-123"
  },
  "message": "Terraform outputs retrieved successfully"
}
```

#### Get Terraform State
```http
GET /api/deploy/state/:projectId
```

**Response:**
```json
{
  "projectId": "string",
  "state": {
    "version": 4,
    "terraform_version": "1.5.0",
    "serial": 1,
    "lineage": "abc123",
    "outputs": { ... },
    "resources": [ ... ]
  },
  "message": "Terraform state retrieved successfully"
}
```

## Deployment Status Types

- `not_deployed`: Infrastructure has not been deployed yet
- `pending`: Deployment job is in progress
- `deployed`: Infrastructure is successfully deployed
- `failed`: Deployment failed
- `destroyed`: Infrastructure has been destroyed

## Job Status Types

- `pending`: Job is queued and waiting to start
- `processing`: Job is currently running
- `completed`: Job completed successfully
- `failed`: Job failed with an error

## Usage Examples

### Complete Deployment Workflow

1. **Generate Infrastructure Code**
   ```javascript
   // First, generate IaC using the existing /api/iac endpoint
   const iacResponse = await fetch('/api/iac', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       prompt: "Create a web application with API Gateway, Lambda, and DynamoDB",
       projectId: "project-123",
       umlDiagrams: { ... }
     })
   });
   ```

2. **Deploy Infrastructure**
   ```javascript
   const deployResponse = await fetch('/api/deploy', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       projectId: "project-123",
       iacCode: iacResponse.code
     })
   });
   
   const { jobId } = await deployResponse.json();
   ```

3. **Monitor Deployment Progress**
   ```javascript
   const checkStatus = async () => {
     const statusResponse = await fetch(`/api/deploy/status/${jobId}`);
     const status = await statusResponse.json();
     
     if (status.status === 'completed') {
       console.log('Deployment successful!', status.result);
     } else if (status.status === 'failed') {
       console.error('Deployment failed:', status.error);
     } else {
       console.log(`Progress: ${status.progress}%`);
       setTimeout(checkStatus, 5000); // Check again in 5 seconds
     }
   };
   
   checkStatus();
   ```

4. **Get Infrastructure Details**
   ```javascript
   const infraResponse = await fetch('/api/deploy/infrastructure/project-123');
   const infraStatus = await infraResponse.json();
   
   console.log('Deployment Status:', infraStatus.deploymentStatus);
   console.log('Outputs:', infraStatus.deploymentOutputs);
   ```

5. **Estimate Costs**
   ```javascript
   const costsResponse = await fetch('/api/deploy/costs/project-123');
   const costs = await costsResponse.json();
   
   console.log('Monthly Cost Estimate:', costs.costs.total);
   ```

6. **Destroy Infrastructure (when done)**
   ```javascript
   const destroyResponse = await fetch('/api/deploy/destroy', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       projectId: "project-123"
     })
   });
   
   const { jobId: destroyJobId } = await destroyResponse.json();
   ```

### Error Handling

```javascript
try {
  const response = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: "project-123",
      iacCode: "terraform { ... }"
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Deployment failed');
  }
  
  const result = await response.json();
  console.log('Deployment started:', result.jobId);
  
} catch (error) {
  console.error('Deployment error:', error.message);
}
```

## Configuration

### Environment Variables

The system requires the following environment variables:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1

# Terraform Runner URL (default: http://localhost:8000)
TERRAFORM_RUNNER_URL=http://localhost:8000
```

### Terraform Runner Setup

The Python Terraform runner requires:

```bash
pip install fastapi uvicorn python-terraform python-dotenv
```

Start the Terraform runner:
```bash
cd terraform-runner
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Security Considerations

1. **AWS Credentials**: Store AWS credentials securely using environment variables or IAM roles
2. **Terraform State**: Consider using remote state storage (S3 + DynamoDB) for production
3. **Access Control**: Implement proper authentication and authorization for deployment endpoints
4. **Resource Limits**: Set appropriate AWS service limits and budgets

## Troubleshooting

### Common Issues

1. **Terraform Runner Not Running**
   - Ensure the Python service is running on port 8000
   - Check logs for connection errors

2. **AWS Credentials Issues**
   - Verify AWS credentials are properly configured
   - Check IAM permissions for required AWS services

3. **Terraform Configuration Errors**
   - Use the validation endpoint to check configuration
   - Review Terraform logs for specific error messages

4. **Deployment Timeouts**
   - Some resources (like RDS) can take 10-15 minutes to provision
   - Monitor job status for progress updates

### Debugging

Enable debug logging:
```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=terraform.log
```

Check Terraform runner logs:
```bash
tail -f terraform-runner/logs/terraform.log
```

## Best Practices

1. **Always validate configurations** before deployment
2. **Monitor costs** regularly using the cost estimation feature
3. **Use job status tracking** for long-running deployments
4. **Clean up resources** when no longer needed
5. **Backup important data** before destroying infrastructure
6. **Test deployments** in a staging environment first

## Future Enhancements

- Remote state management
- Multi-cloud support (Azure, GCP)
- Infrastructure drift detection
- Automated backup and recovery
- Integration with CI/CD pipelines
- Advanced cost optimization recommendations 