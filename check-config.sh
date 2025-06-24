#!/bin/bash

# Quick script to check current configuration values
echo "🔧 Current Configuration:"
echo "================================"

# Extract values from setup script
AWS_ACCOUNT_ID=$(grep '^AWS_ACCOUNT_ID=' setup-heroku-production.sh | cut -d'"' -f2)
DEFAULT_APP_NAME=$(grep '^DEFAULT_HEROKU_APP_NAME=' setup-heroku-production.sh | cut -d'"' -f2)
DEFAULT_REGION=$(grep '^DEFAULT_AWS_REGION=' setup-heroku-production.sh | cut -d'"' -f2)
DEFAULT_FRONTEND=$(grep '^DEFAULT_FRONTEND_URL=' setup-heroku-production.sh | cut -d'"' -f2)

echo "📋 Configured Defaults:"
echo "  • AWS Account ID: $AWS_ACCOUNT_ID"
echo "  • Heroku App Name: $DEFAULT_APP_NAME"
echo "  • AWS Region: $DEFAULT_REGION"
echo "  • Frontend URL: $DEFAULT_FRONTEND"

echo
echo "🔑 Environment Variables:"
echo "  • AWS_ACCESS_KEY_ID: $([ -n "$AWS_ACCESS_KEY_ID" ] && echo "✅ Set" || echo "❌ Not set")"
echo "  • AWS_SECRET_ACCESS_KEY: $([ -n "$AWS_SECRET_ACCESS_KEY" ] && echo "✅ Set" || echo "❌ Not set")"
echo "  • OPENAI_API_KEY: $([ -n "$OPENAI_API_KEY" ] && echo "✅ Set" || echo "❌ Not set")"

echo
echo "🎯 Credential Detection:"
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "  • Will use: Direct AWS credentials"
else
    echo "  • Will use: IAM role assumption"
fi

echo
echo "📝 To customize configuration:"
echo "  • Edit setup-heroku-production.sh (lines 9-15)"
echo "  • Set environment variables before running setup"
echo "  • Override with: HEROKU_APP_NAME=my-app ./setup-heroku-production.sh" 