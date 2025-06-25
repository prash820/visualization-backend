#!/bin/bash

# Install Terraform binary for Heroku deployment
set -e

echo "📦 Installing Terraform..."

# Set Terraform version
TERRAFORM_VERSION="1.5.7"
TERRAFORM_URL="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"

# Create bin directory if it doesn't exist
mkdir -p /app/bin

# Download and install Terraform
echo "⬇️ Downloading Terraform ${TERRAFORM_VERSION}..."
curl -L -o /tmp/terraform.zip "$TERRAFORM_URL"

echo "📂 Extracting Terraform..."
cd /tmp
unzip -q terraform.zip
chmod +x terraform

echo "📍 Installing Terraform to /app/bin..."
mv terraform /app/bin/

echo "✅ Terraform installation completed!"
echo "🔍 Terraform version:"
/app/bin/terraform version 