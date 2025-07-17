# Lambda Backend

This is a Node.js backend application designed to be deployed on AWS Lambda using the Serverless Framework. It uses Express.js and integrates with AWS services.

## Prerequisites

- Node.js and npm installed
- AWS CLI configured
- Serverless Framework installed globally (`npm install -g serverless`)

## Installation

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Copy `.env.example` to `.env` and configure your environment variables.

## Scripts

- `npm run build`: Compiles TypeScript to JavaScript.
- `npm run dev`: Runs the application locally using `ts-node`.
- `npm run deploy`: Deploys the application to AWS Lambda using Serverless Framework.

## Deployment

Ensure your AWS credentials are configured and run `npm run deploy` to deploy the application to AWS Lambda.

## Local Development

Use `npm run dev` to start the application locally. You can test the endpoints using a tool like Postman or curl.

## Environment Variables

- `DYNAMODB_CALC_TABLE`: The name of the DynamoDB table used for storing calculations.

## License

This project is licensed under the MIT License.