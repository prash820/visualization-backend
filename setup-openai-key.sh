#!/bin/bash

# Helper script to set up OpenAI API key

echo "🔑 Setting up OpenAI API key..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup first:"
    echo "   ./setup-test-env.sh"
    exit 1
fi

# Check if API key is already set
if grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "✅ OpenAI API key is already set"
    echo ""
    echo "Current API key:"
    grep "OPENAI_API_KEY=" .env | sed 's/OPENAI_API_KEY=sk-*/OPENAI_API_KEY=sk-***/'
    echo ""
    echo "To change your API key, edit the .env file:"
    echo "   nano .env"
    exit 0
fi

echo ""
echo "📋 To get your OpenAI API key:"
echo "1. Go to https://platform.openai.com/api-keys"
echo "2. Sign in to your OpenAI account"
echo "3. Click 'Create new secret key'"
echo "4. Copy the generated key (starts with 'sk-')"
echo ""

# Prompt for API key
read -p "Enter your OpenAI API key (starts with 'sk-'): " api_key

# Validate API key format
if [[ $api_key == sk-* ]]; then
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/OPENAI_API_KEY=/OPENAI_API_KEY=$api_key/" .env
    else
        # Linux
        sed -i "s/OPENAI_API_KEY=/OPENAI_API_KEY=$api_key/" .env
    fi
    
    echo "✅ OpenAI API key set successfully!"
    echo ""
    echo "You can now run the test:"
    echo "   ./run-ast-test.sh"
else
    echo "❌ Invalid API key format. API key should start with 'sk-'"
    echo ""
    echo "Please try again or manually edit the .env file:"
    echo "   nano .env"
    exit 1
fi 