#!/bin/bash

echo "🐍 Testing Python Dependencies Installation"
echo "============================================"

# Check if Python is available
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.x"
    exit 1
fi

PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "✅ Using Python: $($PYTHON_CMD --version)"

# Check if pip is available
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo "❌ pip not found. Please install pip"
    exit 1
fi

PIP_CMD="pip3"
if ! command -v pip3 &> /dev/null; then
    PIP_CMD="pip"
fi

echo "✅ Using pip: $($PIP_CMD --version)"

# Test installing dependencies
echo
echo "📦 Testing requirements.txt installation..."
echo "This simulates what Heroku will do:"

if [ -f "requirements.txt" ]; then
    echo "✅ Found requirements.txt at root level"
    echo "Dependencies to install:"
    cat requirements.txt
    
    echo
    echo "🔧 Test installation (dry-run):"
    $PIP_CMD install --dry-run -r requirements.txt
    
    if [ $? -eq 0 ]; then
        echo "✅ All dependencies can be installed successfully"
    else
        echo "❌ Some dependencies have issues"
    fi
else
    echo "❌ requirements.txt not found at root level"
    exit 1
fi

echo
echo "🚀 Heroku buildpack order:"
echo "  1. Node.js buildpack (installs npm dependencies)"
echo "  2. Python buildpack (installs requirements.txt)"
echo "  3. Terraform buildpack (installs Terraform)"
echo
echo "💡 This should fix the 'pip: not found' error!" 