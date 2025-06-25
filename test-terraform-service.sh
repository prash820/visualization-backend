#!/bin/bash

echo "🧪 Testing Terraform FastAPI Service"
echo "===================================="

# Check if we're in the right directory
if [ ! -d "terraform-runner" ]; then
    echo "❌ terraform-runner directory not found"
    echo "Please run from visualization-backend directory"
    exit 1
fi

# Check if Python requirements are installed
echo "📦 Checking Python dependencies..."
cd terraform-runner

if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found in terraform-runner"
    exit 1
fi

# Check if Python and pip are available
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
    if ! command -v python &> /dev/null; then
        echo "❌ Python not found"
        exit 1
    fi
fi

echo "✅ Using Python: $($PYTHON_CMD --version)"

# Try to import required modules
echo "🔍 Testing Python imports..."
$PYTHON_CMD -c "
import sys
try:
    import fastapi
    import uvicorn
    import boto3
    print('✅ All required Python modules available')
except ImportError as e:
    print(f'❌ Missing Python module: {e}')
    print('Run: pip install -r requirements.txt')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Python dependencies not installed"
    echo "Install with: pip install -r requirements.txt"
    exit 1
fi

# Test the FastAPI app startup
echo
echo "🚀 Testing FastAPI service startup..."
echo "Setting TERRAFORM_PORT=8000"
export TERRAFORM_PORT=8000

# Start the service in background and test
echo "Starting service..."
timeout 10s $PYTHON_CMD main.py &
SERVICE_PID=$!

# Wait a moment for startup
sleep 3

# Test health endpoint
echo "Testing health endpoint..."
if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s http://localhost:8000/health 2>/dev/null || echo "failed")
    if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
        echo "✅ Health endpoint responding correctly"
        echo "Response: $HEALTH_RESPONSE"
    else
        echo "❌ Health endpoint not responding"
        echo "Response: $HEALTH_RESPONSE"
    fi
else
    echo "⚠️  curl not available, skipping health check"
fi

# Clean up
kill $SERVICE_PID 2>/dev/null || true
wait $SERVICE_PID 2>/dev/null || true

cd ..

echo
echo "🎯 Heroku Deployment Commands:"
echo "After deploying, run these commands:"
echo "  heroku ps:scale terraform=1 -a your-app-name"
echo "  heroku logs --tail -a your-app-name"
echo "  curl https://your-app.herokuapp.com:8000/health" 