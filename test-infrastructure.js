const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001/api';
const PROJECT_ID = 'test-project-' + Date.now();

// Sample Terraform configuration for testing
const sampleTerraformConfig = `
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Sample S3 bucket
resource "aws_s3_bucket" "test_bucket" {
  bucket = "test-bucket-${Date.now()}"
}

resource "aws_s3_bucket_public_access_block" "test_bucket" {
  bucket = aws_s3_bucket.test_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Sample Lambda function
resource "aws_lambda_function" "test_function" {
  filename         = "lambda_function.zip"
  function_name    = "test-function-${Date.now()}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
}

resource "aws_iam_role" "lambda_role" {
  name = "lambda-role-${Date.now()}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Outputs
output "bucket_name" {
  value = aws_s3_bucket.test_bucket.bucket
}

output "lambda_function_name" {
  value = aws_lambda_function.test_function.function_name
}
`;

async function testInfrastructureProvisioning() {
  console.log('🧪 Testing Infrastructure Provisioning System\n');

  try {
    // Test 1: Validate Terraform Configuration
    console.log('1. Testing Terraform Configuration Validation...');
    const validationResponse = await fetch(`${BASE_URL}/deploy/validate/${PROJECT_ID}`);
    const validationResult = await validationResponse.json();
    console.log('   Validation Result:', validationResult);
    console.log('   ✅ Validation test completed\n');

    // Test 2: Deploy Infrastructure
    console.log('2. Testing Infrastructure Deployment...');
    const deployResponse = await fetch(`${BASE_URL}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: PROJECT_ID,
        iacCode: sampleTerraformConfig
      })
    });

    if (!deployResponse.ok) {
      throw new Error(`Deployment failed: ${deployResponse.status}`);
    }

    const deployResult = await deployResponse.json();
    console.log('   Deployment Result:', deployResult);
    console.log('   ✅ Deployment test completed\n');

    // Test 3: Get Infrastructure Status
    console.log('3. Testing Infrastructure Status...');
    const statusResponse = await fetch(`${BASE_URL}/deploy/infrastructure/${PROJECT_ID}`);
    const statusResult = await statusResponse.json();
    console.log('   Status Result:', statusResult);
    console.log('   ✅ Status test completed\n');

    // Test 4: Get Terraform Outputs
    console.log('4. Testing Terraform Outputs...');
    const outputsResponse = await fetch(`${BASE_URL}/deploy/outputs/${PROJECT_ID}`);
    const outputsResult = await outputsResponse.json();
    console.log('   Outputs Result:', outputsResult);
    console.log('   ✅ Outputs test completed\n');

    // Test 5: Get Terraform State
    console.log('5. Testing Terraform State...');
    const stateResponse = await fetch(`${BASE_URL}/deploy/state/${PROJECT_ID}`);
    const stateResult = await stateResponse.json();
    console.log('   State Result:', stateResult);
    console.log('   ✅ State test completed\n');

    // Test 6: Estimate Costs
    console.log('6. Testing Cost Estimation...');
    const costsResponse = await fetch(`${BASE_URL}/deploy/costs/${PROJECT_ID}`);
    const costsResult = await costsResponse.json();
    console.log('   Costs Result:', costsResult);
    console.log('   ✅ Costs test completed\n');

    // Test 7: Destroy Infrastructure
    console.log('7. Testing Infrastructure Destruction...');
    const destroyResponse = await fetch(`${BASE_URL}/deploy/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: PROJECT_ID
      })
    });

    if (!destroyResponse.ok) {
      throw new Error(`Destruction failed: ${destroyResponse.status}`);
    }

    const destroyResult = await destroyResponse.json();
    console.log('   Destruction Result:', destroyResult);
    console.log('   ✅ Destruction test completed\n');

    console.log('🎉 All infrastructure provisioning tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test job status tracking
async function testJobStatusTracking() {
  console.log('\n🧪 Testing Job Status Tracking...\n');

  try {
    // Deploy infrastructure to get a job ID
    const deployResponse = await fetch(`${BASE_URL}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: PROJECT_ID + '-job-test',
        iacCode: sampleTerraformConfig
      })
    });

    const deployResult = await deployResponse.json();
    const jobId = deployResult.jobId;

    console.log(`   Job ID: ${jobId}`);

    // Check job status multiple times
    for (let i = 0; i < 5; i++) {
      const statusResponse = await fetch(`${BASE_URL}/deploy/status/${jobId}`);
      const statusResult = await statusResponse.json();
      
      console.log(`   Status Check ${i + 1}:`, {
        status: statusResult.status,
        progress: statusResult.progress,
        hasError: !!statusResult.error
      });

      if (statusResult.status === 'completed' || statusResult.status === 'failed') {
        break;
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('   ✅ Job status tracking test completed\n');

  } catch (error) {
    console.error('❌ Job status tracking test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Infrastructure Provisioning System Tests\n');
  console.log(`📋 Test Project ID: ${PROJECT_ID}\n`);

  await testInfrastructureProvisioning();
  await testJobStatusTracking();

  console.log('\n🏁 All tests completed!');
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error('Please ensure the backend server is running on port 5001');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }

  await runAllTests();
}

main().catch(console.error); 