# Infrastructure Documentation

This document outlines the infrastructure setup for a DoorDash clone app using AWS services with Terraform.

## Services Used

- **AWS API Gateway**: Serves as the entry point for the application, handling incoming requests.
- **AWS Lambda**: Used for executing the business logic of the app. Separate Lambda functions are created for User, Restaurant, and Order services.
- **Amazon S3**: Provides storage for application data that's not suited for databases (e.g., images, large files).
- **Amazon DynamoDB**: NoSQL database service used for storing user, restaurant, and order data.

## IAM Roles and Policies

- **Lambda Execution Role**: IAM role that allows Lambda functions to assume an execution role. This role has policies attached that grant access to necessary AWS services like DynamoDB, S3, and CloudWatch Logs.

## Networking and Security

The setup does not explicitly define VPC, security groups, or subnets, as the services used (Lambda, DynamoDB, S3, API Gateway) are serverless and managed by AWS, which abstracts the underlying network infrastructure. However, IAM roles and policies are used to secure access to resources.

## Deployment Steps

1. Define your AWS provider and region.
2. Create the necessary IAM roles and policies for Lambda functions.
3. Deploy the Lambda functions for User, Restaurant, and Order services.
4. Set up the DynamoDB tables for users, restaurants, and orders.
5. Create an S3 bucket for storing application data.
6. Deploy the API Gateway as the front door for the application.

By following these steps, you will have a basic infrastructure setup for a DoorDash clone app on AWS, leveraging serverless technologies for scalability and ease of management.