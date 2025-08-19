#!/bin/bash

# Run script for AST-based code generation test

echo "🚀 Running AST-based code generation test..."

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 5001"
    echo "Please start the server first:"
    echo "   npm run dev"
    echo ""
    echo "Or in a separate terminal:"
    echo "   node dist/server.js"
    exit 1
fi

echo "✅ Server is running"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup first:"
    echo "   ./setup-test-env.sh"
    exit 1
fi

# Check if OpenAI API key is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  Warning: OpenAI API key not set in .env file"
    echo "Please set your OpenAI API key in the .env file:"
    echo "   OPENAI_API_KEY=sk-your-api-key-here"
    echo ""
    echo "The test will still run but may fail if API calls are needed."
    echo ""
    echo "To set your API key:"
    echo "   1. Get your API key from https://platform.openai.com/api-keys"
    echo "   2. Edit the .env file: nano .env"
    echo "   3. Set: OPENAI_API_KEY=sk-your-actual-key-here"
    echo ""
fi

echo "🧪 Starting AST generation test..."
echo ""

# Run the test
node test-ast-generation.js

echo ""
echo "�� Test completed!" 