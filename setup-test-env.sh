#!/bin/bash

# Setup script for AST generation test environment

echo "🔧 Setting up test environment for AST-based code generation..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Database Configuration
DATABASE_URL=postgresql://localhost:5432/devdb
DATABASE_NAME=devdb
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_PORT=5432
DATABASE_TYPE=postgresql

# API Gateway Configuration
API_GATEWAY_URL=http://localhost:3003
API_GATEWAY_ID=dev-api-gateway
API_GATEWAY_STAGE=dev

# Lambda Configuration
LAMBDA_FUNCTION_URL=http://localhost:3003
LAMBDA_FUNCTION_ARN=arn:aws:lambda:us-east-1:123456789012:function:dev-main

# Storage Configuration
S3_BUCKET_NAME=dev-bucket
S3_BUCKET_REGION=us-east-1

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Test Configuration
TEST_PROJECT_ID=test-ast-generation-\$(date +%s)
TEST_PROMPT=Create a simple user management system with User model, UserService, and UserController
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Check if required dependencies are installed
echo "📦 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Server is running on port 5001"
else
    echo "⚠️  Server is not running. Please start the server first:"
    echo "   npm run dev"
    echo ""
    echo "Or in a separate terminal:"
    echo "   node dist/server.js"
fi

echo ""
echo "🎯 Test Environment Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Set your OpenAI API key in the .env file:"
echo "   OPENAI_API_KEY=sk-your-actual-api-key-here"
echo ""
echo "2. Start the server:"
echo "   npm run dev"
echo ""
echo "3. Run the test:"
echo "   ./run-ast-test.sh"
echo ""
echo "Or run the test directly:"
echo "   node test-ast-generation.js" 