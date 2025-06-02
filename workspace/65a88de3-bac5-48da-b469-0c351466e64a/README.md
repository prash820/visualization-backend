# Infrastructure Documentation

This documentation outlines the AWS infrastructure for an Uber clone app, provisioned using Terraform. The setup includes AWS Cognito for authentication, DynamoDB for data storage, Lambda functions for business logic, API Gateway for RESTful services, and SNS for notifications.

## Components

- **Amazon Cognito**: Manages user authentication and authorization.
- **DynamoDB**: NoSQL database for storing user, driver, rider, and trip data.
- **Lambda Functions**: Four separate Lambda functions for rider management, driver management, trip management, and payment processing.
- **API Gateway**: Provides RESTful API endpoints for the app's frontend to interact with the backend services.
- **Simple Notification Service (SNS)**: Used for sending notifications to riders and drivers.

## Security

- IAM roles and policies are set up to grant the necessary permissions to the Lambda functions for accessing DynamoDB and SNS.

## Networking

- API Gateway is configured to expose the Lambda functions as HTTP endpoints, which are secured using Amazon Cognito for user authentication.

This infrastructure is designed to be scalable and secure, providing a solid foundation for building a ride-sharing application on AWS.