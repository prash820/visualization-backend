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

# Get the script directory and create bin directory there
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_DIR="${SCRIPT_DIR}/bin"

echo "📁 Creating bin directory at: ${BIN_DIR}"
mkdir -p "${BIN_DIR}"

# Download and install Terraform
echo "⬇️ Downloading Terraform ${TERRAFORM_VERSION}..."
curl -L -o /tmp/terraform.zip "$TERRAFORM_URL"

echo "📂 Extracting Terraform..."
cd /tmp
unzip -q terraform.zip
chmod +x terraform

echo "📍 Installing Terraform to ${BIN_DIR}..."
mv terraform "${BIN_DIR}/"

echo "✅ Terraform installation completed!"
echo "🔍 Terraform binary location: ${BIN_DIR}/terraform"
echo "🔍 Terraform version:"
"${BIN_DIR}/terraform" version

echo "🔍 Final bin directory contents:"
ls -la "${BIN_DIR}/" 