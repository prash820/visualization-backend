Here's the comprehensive AWS infrastructure code using Terraform for the "E-Commerce Hub" application. This configuration includes all the necessary AWS services such as API Gateway, Lambda, DynamoDB, S3, Cognito, CloudWatch, and IAM roles and policies. The configuration follows Terraform best practices and includes security, monitoring, and cost optimization strategies.

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
    Name = "ecommerce-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "ecommerce-public-subnet"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "ecommerce-gateway"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags = {
    Name = "ecommerce-public-route-table"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Cognito User Pool for Authentication
resource "aws_cognito_user_pool" "user_pool" {
  name = "ecommerce-user-pool-${random_string.suffix.result}"
  
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
  name         = "ecommerce-user-pool-client-${random_string.suffix.result}"
  user_pool_id = aws_cognito_user_pool.user_pool.id
  
  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# DynamoDB Tables
resource "aws_dynamodb_table" "users_table" {
  name           = "ecommerce-users-table-${random_string.suffix.result}"
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

resource "aws_dynamodb_table" "products_table" {
  name           = "ecommerce-products-table-${random_string.suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  attribute {
    name = "category"
    type = "S"
  }
  
  global_secondary_index {
    name     = "category-index"
    hash_key = "category"
  }
}

resource "aws_dynamodb_table" "orders_table" {
  name           = "ecommerce-orders-table-${random_string.suffix.result}"
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

# S3 Bucket for Static File Hosting
resource "aws_s3_bucket" "static_files" {
  bucket = "ecommerce-static-files-${random_string.suffix.result}"
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
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_files.arn}/*"
      }
    ]
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
  name = "ecommerce-lambda-exec-${random_string.suffix.result}"

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
  name = "ecommerce-lambda-policy-${random_string.suffix.result}"

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
          aws_dynamodb_table.products_table.arn,
          aws_dynamodb_table.orders_table.arn
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
resource "aws_lambda_function" "auth_function" {
  function_name = "ecommerce-auth-function-${random_string.suffix.result}"
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

resource "aws_lambda_function" "product_function" {
  function_name = "ecommerce-product-function-${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV           = "production"
      PRODUCTS_TABLE     = aws_dynamodb_table.products_table.name
      S3_BUCKET          = aws_s3_bucket.static_files.id
    }
  }
}

resource "aws_lambda_function" "order_function" {
  function_name = "ecommerce-order-function-${random_string.suffix.result}"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  role          = aws_iam_role.lambda_exec.arn

  filename         = "placeholder.zip"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      NODE_ENV           = "production"
      ORDERS_TABLE       = aws_dynamodb_table.orders_table.name
      USERS_TABLE        = aws_dynamodb_table.users_table.name
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "main_api" {
  name          = "ecommerce-main-api-${random_string.suffix.result}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "auth_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.auth_function.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "product_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.product_function.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "order_integration" {
  api_id             = aws_apigatewayv2_api.main_api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.order_function.arn
  integration_method = "POST"
  payload_format_version = "2.0"
}

# API Gateway Routes
resource "aws_apigatewayv2_route" "auth_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "POST /auth/*"
  target    = "integrations/${aws_apigatewayv2_integration.auth_integration.id}"
}

resource "aws_apigatewayv2_route" "product_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "ANY /products/*"
  target    = "integrations/${aws_apigatewayv2_integration.product_integration.id}"
}

resource "aws_apigatewayv2_route" "order_route" {
  api_id    = aws_apigatewayv2_api.main_api.id
  route_key = "ANY /orders/*"
  target    = "integrations/${aws_apigatewayv2_integration.order_integration.id}"
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

resource "aws_lambda_permission" "product_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.product_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "order_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.order_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main_api.execution_arn}/*/*"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "auth_logs" {
  name              = "/aws/lambda/${aws_lambda_function.auth_function.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "product_logs" {
  name              = "/aws/lambda/${aws_lambda_function.product_function.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "order_logs" {
  name              = "/aws/lambda/${aws_lambda_function.order_function.function_name}"
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

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront distribution domain name"
}
```

This Terraform configuration sets up a comprehensive AWS infrastructure for the "E-Commerce Hub" application, including all necessary components for a scalable and secure e-commerce platform.