# Lambda Backend

This project is a Node.js backend deployed as an AWS Lambda function using the Serverless Framework. It includes an Express.js application integrated with AWS Lambda via `serverless-http`.

## Prerequisites

- Node.js and npm/yarn installed
- AWS account with IAM permissions for Lambda and API Gateway
- Serverless Framework installed globally (`npm install -g serverless`)

## Setup

1. Clone the repository.
2. Install dependencies: `npm install` or `yarn install`.
3. Create a `.env` file based on `.env.example` and fill in the required values.

## Scripts

- `npm run build`: Compiles TypeScript to JavaScript.
- `npm run dev`: Runs the application locally using `ts-node`.
- `npm run deploy`: Deploys the application to AWS Lambda using the Serverless Framework.

## Deployment

To deploy the application, run:

```bash
serverless deploy
```

This will package and deploy your application to AWS Lambda and create the necessary API Gateway endpoints.

## Local Development

To run the application locally, use:

```bash
npm run dev
```

This will start the Express.js server locally for testing purposes.

## License

This project is licensed under the MIT License.