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

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "public-subnet"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "main-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    Name = "public-route-table"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Cognito User Pool for Authentication
resource "aws_cognito_user_pool" "user_pool" {
  name = "user-pool-${random_string.suffix.result}"
  
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
  name         = "user-pool-client-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  
  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# DynamoDB Tables
resource "aws_dynamodb_table" "users_table" {
  name           = "users-table-${random_string.suffix.result}"
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

resource "aws_dynamodb_table" "uml_diagram_table" {
  name           = "uml-diagram-table-${random_string.suffix.result}"
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

resource "aws_dynamodb_table" "generated_code_table" {
  name           = "generated-code-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "umlDiagramId"
    type = "S"
  }
  
  global_secondary_index {
    name     = "uml-diagram-index"
    hash_key = "umlDiagramId"
  }
}

resource "aws_dynamodb_table" "deployment_table" {
  name           = "deployment-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "generatedCodeId"
    type = "S"
  }
  
  global_secondary_index {
    name     = "generated-code-index"
    hash_key = "generatedCodeId"
  }
}

# S3 Bucket for Static File Hosting
resource "aws_s3_bucket" "static_files" {
  bucket = "static-files-${random_string.suffix.result}"
  acl    = "public-read"

  website {
    index_document = "index.html"
    error_document = "error.html"
  }
}

resource "aws_s3_bucket_policy" "static_files_policy" {
  bucket = aws_s3_bucket.static_files.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = "*"
      Action = "s3:GetObject"
      Resource = "${aws_s3_bucket.static_files.arn}/*"
    }]
  })
}

# CloudFront Distribution for S3
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.static_files.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.static_files.id}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for static files"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.static_files.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
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
  name = "lambda-exec-${random_string.suffix.result}"

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
  name = "lambda-policy-${random_string.suffix.result}"

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
          aws_dynamodb_table.uml_diagram_table.arn,
          aws_dynamodb_table.generated_code_table.arn,
          aws_dynamodb_table.deployment_table.arn
        ]
      },
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.static_files.arn}/*"
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
resource "aws_lambda_function" "process_diagrams" {
  function_name = "process-diagrams-${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV           = "production"
      USERS_TABLE        = aws_dynamodb_table.users_table.name
      UML_DIAGRAM_TABLE  = aws_dynamodb_table.uml_diagram_table.name
      GENERATED_CODE_TABLE = aws_dynamodb_table.generated_code_table.name
      DEPLOYMENT_TABLE   = aws_dynamodb_table.deployment_table.name
    }
  }
}

resource "aws_lambda_function" "deploy_code" {
  function_name = "deploy-code-${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV           = "production"
      GENERATED_CODE_TABLE = aws_dynamodb_table.generated_code_table.name
      DEPLOYMENT_TABLE   = aws_dynamodb_table.deployment_table.name
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "main_api" {
  name          = "main-api-${random_string.suffix.result}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "process_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.process_diagrams.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "deploy_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.deploy_code.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# API Gateway Routes
resource "aws_apigatewayv2_route" "process_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "POST /process"
  target    = "integrations/${aws_apigatewayv2_integration.process_integration.id}"
}

resource "aws_apigatewayv2_route" "deploy_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "POST /deploy"
  target    = "integrations/${aws_apigatewayv2_integration.deploy_integration.id}"
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.main_api.id
  name        = "$default"
  auto_deploy = true
}

# Lambda Permissions
resource "aws_lambda_permission" "process_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_diagrams.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "deploy_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.deploy_code.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main_api.execution_arn}/*/*"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "process_logs" {
  name              = "/aws/lambda/${aws_lambda_function.process_diagrams.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "deploy_logs" {
  name              = "/aws/lambda/${aws_lambda_function.deploy_code.function_name}"
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
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront distribution URL"
}
```