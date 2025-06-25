#!/bin/bash

# Install Terraform binary for Heroku deployment
set -e

echo "📦 Installing Terraform..."
echo "🔍 Current directory: $(pwd)"
echo "🔍 Current user: $(whoami)"
echo "🔍 Available space: $(df -h . | tail -1)"

# Set Terraform version
TERRAFORM_VERSION="1.5.7"
TERRAFORM_URL="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"

# Create bin directory in the current build directory
echo "📁 Creating bin directory..."
mkdir -p ./bin
echo "📁 Created bin directory at: $(pwd)/bin"

# Download and install Terraform
echo "⬇️ Downloading Terraform ${TERRAFORM_VERSION}..."
curl -L -o /tmp/terraform.zip "$TERRAFORM_URL"

echo "📂 Extracting Terraform..."
cd /tmp
unzip -q terraform.zip
chmod +x terraform

echo "📍 Installing Terraform to $(pwd)/../bin/..."
mv terraform "$(dirname "$0")/bin/"

echo "✅ Terraform installation completed!"
echo "🔍 Terraform binary location: $(dirname "$0")/bin/terraform"
echo "🔍 Terraform version:"
"$(dirname "$0")/bin/terraform" version

echo "🔍 Final bin directory contents:"
ls -la "$(dirname "$0")/bin/" 