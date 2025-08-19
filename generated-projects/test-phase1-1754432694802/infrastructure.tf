```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
  region = var.aws_region
}

# Random string for unique resource names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Cognito User Pool for Authentication
resource "aws_cognito_user_pool" "user_pool" {
  name = "remote-task-user-pool-${random_string.suffix.result}"
  
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  auto_verified_attributes = ["email"]
  
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
  }
}

resource "aws_cognito_user_pool_client" "user_pool_client" {
  name         = "remote-task-user-pool-client-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  
  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# DynamoDB Tables
resource "aws_dynamodb_table" "users_table" {
  name           = "remote-task-users-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "email"
    type = "S"
  }
  
  global_secondary_index {
    name     = "email-index"
    hash_key = "email"
  }
}

resource "aws_dynamodb_table" "tasks_table" {
  name           = "remote-task-tasks-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }
  
  global_secondary_index {
    name     = "user-index"
    hash_key = "userId"
  }
}

resource "aws_dynamodb_table" "file_attachments_table" {
  name           = "remote-task-file-attachments-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "taskId"
    type = "S"
  }
  
  global_secondary_index {
    name     = "task-index"
    hash_key = "taskId"
  }
}

resource "aws_dynamodb_table" "collaboration_logs_table" {
  name           = "remote-task-collaboration-logs-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "taskId"
    type = "S"
  }
  
  global_secondary_index {
    name     = "task-index"
    hash_key = "taskId"
  }
}

resource "aws_dynamodb_table" "progress_metrics_table" {
  name           = "remote-task-progress-metrics-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "taskId"
    type = "S"
  }
  
  global_secondary_index {
    name     = "task-index"
    hash_key = "taskId"
  }
}

# S3 Bucket for File Storage
resource "aws_s3_bucket" "app_bucket" {
  bucket = "remote-task-app-bucket-${random_string.suffix.result}"
}

resource "aws_s3_bucket_public_access_block" "app_bucket" {
  bucket = aws_s3_bucket.app_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution for S3
resource "aws_cloudfront_distribution" "app_distribution" {
  origin {
    domain_name = aws_s3_bucket.app_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.app_bucket.id}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.app_bucket.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_exec" {
  name = "remote-task-lambda-exec-${random_string.suffix.result}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# IAM Policy for Lambda Functions
resource "aws_iam_policy" "lambda_policy" {
  name = "remote-task-lambda-policy-${random_string.suffix.result}"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Effect   = "Allow"
        Resource = [
          aws_dynamodb_table.users_table.arn,
          aws_dynamodb_table.tasks_table.arn,
          aws_dynamodb_table.file_attachments_table.arn,
          aws_dynamodb_table.collaboration_logs_table.arn,
          aws_dynamodb_table.progress_metrics_table.arn
        ]
      },
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.app_bucket.arn}/*"
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# Lambda Functions
resource "aws_lambda_function" "auth_function" {
  function_name = "remote-task-auth-function-${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV           = "production"
      USER_POOL_ID       = aws_cognito_user_pool.user_pool.id
      USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.user_pool_client.id
      USERS_TABLE        = aws_dynamodb_table.users_table.name
    }
  }
}

resource "aws_lambda_function" "task_function" {
  function_name = "remote-task-task-function-${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV           = "production"
      TASKS_TABLE        = aws_dynamodb_table.tasks_table.name
      FILE_ATTACHMENTS_TABLE = aws_dynamodb_table.file_attachments_table.name
      COLLABORATION_LOGS_TABLE = aws_dynamodb_table.collaboration_logs_table.name
      PROGRESS_METRICS_TABLE = aws_dynamodb_table.progress_metrics_table.name
      S3_BUCKET          = aws_s3_bucket.app_bucket.id
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "main_api" {
  name          = "remote-task-main-api-${random_string.suffix.result}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "auth_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.auth_function.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "task_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.task_function.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# API Gateway Routes
resource "aws_apigatewayv2_route" "auth_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "POST /auth/*"
  target    = "integrations/${aws_apigatewayv2_integration.auth_integration.id}"
}

resource "aws_apigatewayv2_route" "task_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "ANY /api/tasks/*"
  target    = "integrations/${aws_apigatewayv2_integration.task_integration.id}"
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.main_api.id
  name        = "$default"
  auto_deploy = true
}

# Lambda Permissions
resource "aws_lambda_permission" "auth_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "task_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.task_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main_api.execution_arn}/*/*"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "auth_logs" {
  name              = "/aws/lambda/${aws_lambda_function.auth_function.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "task_logs" {
  name              = "/aws/lambda/${aws_lambda_function.task_function.function_name}"
  retention_in_days = 14
}

# Data source for Lambda zip
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "placeholder.zip"
  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Hello from Lambda!' }) });"
    filename = "index.js"
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Outputs
output "api_endpoint" {
  value       = aws_apigatewayv2_stage.default_stage.invoke_url
  description = "API Gateway endpoint URL"
}

output "user_pool_id" {
  value       = aws_cognito_user_pool.user_pool.id
  description = "Cognito User Pool ID"
}

output "user_pool_client_id" {
  value       = aws_cognito_user_pool_client.user_pool_client.id
  description = "Cognito User Pool Client ID"
}

output "cloudfront_url" {
  value       = aws_cloudfront_distribution.app_distribution.domain_name
  description = "CloudFront distribution URL"
}
```