```HCL
provider "aws" {
  region  = "us-west-2"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 2.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-west-2a", "us-west-2b", "us-west-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
  enable_s3_endpoint = true
  enable_rds_endpoint = true
}

resource "aws_security_group" "allow_lambda" {
  name        = "allow_lambda"
  description = "Allow lambda inbound traffic"
  vpc_id      = module.vpc.vpc_id
}

resource "aws_lambda_function" "test_lambda" {
  function_name    = "test_lambda"
  s3_bucket        = "lambda-artifacts"
  s3_key           = "exported-function.zip"
  handler          = "exports.test"
  role             = aws_iam_role.lambda_exec.arn
  runtime          = "nodejs12.x"
  source_code_hash = filebase64sha256("exported-function.zip")

  vpc_config {
    subnet_ids         = module.vpc.public_subnet_ids
    security_group_ids = [aws_security_group.allow_lambda.id]
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_api_gateway_rest_api" "MyDemoAPI" {
  name        = "MyDemoAPI"
  description = "This is my API for demonstration purposes"
}

resource "aws_api_gateway_integration" "MyDemoAPIIntegration" {
  rest_api_id = aws_api_gateway_rest_api.MyDemoAPI.id
  resource_id = aws_api_gateway_resource.MyDemoResource.id
  http_method = aws_api_gateway_method.MyDemoMethod.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.test_lambda.invoke_arn
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.test_lambda.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_s3_bucket" "bucket" {
  bucket = "my-bucket"
  acl    = "private"
}

resource "aws_rds_instance" "default" {
  identifier        = "rds-instance-1"
  engine            = "mysql"
  instance_class    = "db.t2.micro"
  allocated_storage = 20
  name              = "mydb"
  username          = "foo"
  password          = "foobarbaz"
  parameter_group_name = "default.mysql5.7"
  vpc_security_group_ids = [aws_security_group.allow_lambda.id]
  db_subnet_group_name   = module.vpc.database_subnet_group_name
}
```
This Terraform script will create:
- An AWS VPC, with private & public subnets, NAT gateway and enable S3 & RDS endpoints in the VPC.
- An AWS Security group to allow Lambda to perform actions.
- An AWS Lambda function within the VPC.
- An IAM Role with permission to execute the Lambda function.
- An AWS API Gateway to invoke the Lambda function.
- An AWS S3 bucket.
- An AWS RDS instance residing within the VPC.
The IAM Role and S3 bucket are dependencies for the Lambda function. The API Gateway, Lambda function, and Security Group are required to be in the same VPC. The Lambda function communicates with the S3 bucket and RDS instance.