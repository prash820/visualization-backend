#!/bin/bash

# Heroku Production Setup Script for Chart App
# This script sets up Heroku deployment with AWS integration for multi-tenant infrastructure provisioning
# Run this from the visualization-backend directory

set -e

echo "🚀 Setting up Heroku production deployment for Chart App..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "src" ]; then
        print_error "Please run this script from the visualization-backend directory"
        print_error "cd visualization-backend && ./setup-heroku-production.sh"
        exit 1
    fi
    print_success "Running from visualization-backend directory"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v heroku &> /dev/null; then
        print_error "Heroku CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All requirements met!"
}

# Get user input for configuration
get_configuration() {
    print_status "Getting configuration details..."
    
    read -p "Enter your Heroku app name: " HEROKU_APP_NAME
    read -p "Enter your AWS Account ID: " AWS_ACCOUNT_ID
    read -p "Enter your Vercel frontend URL (e.g., https://your-app.vercel.app): " FRONTEND_URL
    read -p "Enter your OpenAI API key: " OPENAI_API_KEY
    read -s -p "Enter a JWT secret (leave empty to generate): " JWT_SECRET
    echo
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        print_success "Generated JWT secret"
    fi
    
    # Generate external ID for AWS role
    EXTERNAL_ID=$(openssl rand -base64 24)
    print_success "Generated AWS external ID"
}

# Create Heroku app
create_heroku_app() {
    print_status "Creating Heroku app: $HEROKU_APP_NAME"
    
    if heroku apps:info $HEROKU_APP_NAME &> /dev/null; then
        print_warning "Heroku app $HEROKU_APP_NAME already exists. Using existing app."
    else
        heroku create $HEROKU_APP_NAME
        print_success "Created Heroku app: $HEROKU_APP_NAME"
    fi
    
    # Set up git remote
    heroku git:remote -a $HEROKU_APP_NAME
}

# Configure buildpacks
setup_buildpacks() {
    print_status "Setting up buildpacks..."
    
    heroku buildpacks:clear -a $HEROKU_APP_NAME
    heroku buildpacks:add heroku/nodejs -a $HEROKU_APP_NAME
    heroku buildpacks:add heroku/python -a $HEROKU_APP_NAME
    heroku buildpacks:add https://github.com/HashiCorp/heroku-buildpack-terraform -a $HEROKU_APP_NAME
    
    print_success "Buildpacks configured"
}

# Add required Heroku add-ons
setup_addons() {
    print_status "Setting up Heroku add-ons..."
    
    # PostgreSQL database
    heroku addons:create heroku-postgresql:mini -a $HEROKU_APP_NAME || print_warning "PostgreSQL addon might already exist"
    
    # Redis for caching and job queues
    heroku addons:create heroku-redis:mini -a $HEROKU_APP_NAME || print_warning "Redis addon might already exist"
    
    # Logging
    heroku addons:create papertrail:choklad -a $HEROKU_APP_NAME || print_warning "Papertrail addon might already exist"
    
    print_success "Add-ons configured"
}

# Create AWS IAM resources
setup_aws_iam() {
    print_status "Setting up AWS IAM resources..."
    
    # Create IAM policy
    cat > /tmp/chart-app-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "lambda:*",
                "apigateway:*",
                "dynamodb:*",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:GetRole",
                "iam:PassRole",
                "iam:ListRolePolicies",
                "iam:ListAttachedRolePolicies",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "logs:*",
                "cloudformation:*",
                "sts:GetCallerIdentity"
            ],
            "Resource": "*",
            "Condition": {
                "StringEquals": {
                    "aws:RequestedRegion": ["us-east-1", "us-west-2"]
                }
            }
        }
    ]
}
EOF
    
    # Create the policy
    POLICY_ARN=$(aws iam create-policy \
        --policy-name ChartAppInfraProvisioningPolicy \
        --policy-document file:///tmp/chart-app-policy.json \
        --query 'Policy.Arn' \
        --output text 2>/dev/null || \
        aws iam get-policy \
        --policy-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:policy/ChartAppInfraProvisioningPolicy" \
        --query 'Policy.Arn' \
        --output text)
    
    print_success "Created/found IAM policy: $POLICY_ARN"
    
    # Create trust policy for the role
    cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::${AWS_ACCOUNT_ID}:root"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "sts:ExternalId": "${EXTERNAL_ID}"
                }
            }
        }
    ]
}
EOF
    
    # Create the role
    ROLE_ARN=$(aws iam create-role \
        --role-name ChartAppHerokuRole \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --query 'Role.Arn' \
        --output text 2>/dev/null || \
        aws iam get-role \
        --role-name ChartAppHerokuRole \
        --query 'Role.Arn' \
        --output text)
    
    print_success "Created/found IAM role: $ROLE_ARN"
    
    # Attach policy to role
    aws iam attach-role-policy \
        --role-name ChartAppHerokuRole \
        --policy-arn "$POLICY_ARN" || true
    
    print_success "Attached policy to role"
    
    # Clean up temp files
    rm -f /tmp/chart-app-policy.json /tmp/trust-policy.json
}

# Set Heroku environment variables
set_env_vars() {
    print_status "Setting Heroku environment variables..."
    
    # AWS Configuration
    heroku config:set AWS_REGION=us-east-1 -a $HEROKU_APP_NAME
    heroku config:set AWS_ROLE_ARN="$ROLE_ARN" -a $HEROKU_APP_NAME
    heroku config:set AWS_EXTERNAL_ID="$EXTERNAL_ID" -a $HEROKU_APP_NAME
    heroku config:set AWS_SESSION_NAME=chart-app-heroku-session -a $HEROKU_APP_NAME
    
    # Application Configuration
    heroku config:set NODE_ENV=production -a $HEROKU_APP_NAME
    heroku config:set PORT=5001 -a $HEROKU_APP_NAME
    heroku config:set TERRAFORM_PORT=8000 -a $HEROKU_APP_NAME
    
    # Security
    heroku config:set JWT_SECRET="$JWT_SECRET" -a $HEROKU_APP_NAME
    heroku config:set CORS_ORIGIN="$FRONTEND_URL" -a $HEROKU_APP_NAME
    
    # External Services
    heroku config:set OPENAI_API_KEY="$OPENAI_API_KEY" -a $HEROKU_APP_NAME
    
    # Resource Limits
    heroku config:set MAX_RESOURCES_PER_USER=10 -a $HEROKU_APP_NAME
    heroku config:set MAX_COST_PER_PROJECT=50 -a $HEROKU_APP_NAME
    heroku config:set MAX_TOTAL_COST_PER_USER=100 -a $HEROKU_APP_NAME
    heroku config:set RESOURCE_TIMEOUT_MINUTES=60 -a $HEROKU_APP_NAME
    
    print_success "Environment variables set"
}

# Deploy to Heroku
deploy_app() {
    print_status "Deploying to Heroku..."
    
    # Add all files to git
    git add .
    git commit -m "Production deployment setup from visualization-backend" || true
    
    # Deploy to Heroku
    git push heroku HEAD:main
    
    # Scale the dynos
    heroku ps:scale web=1 -a $HEROKU_APP_NAME
    
    print_success "Deployed to Heroku!"
}

# Print deployment summary
print_summary() {
    echo
    echo "🎉 Deployment Complete!"
    echo "=================================="
    echo "Heroku App: https://$HEROKU_APP_NAME.herokuapp.com"
    echo "AWS Role ARN: $ROLE_ARN"
    echo "External ID: $EXTERNAL_ID"
    echo
    echo "Next Steps:"
    echo "1. Update your Vercel frontend environment variables:"
    echo "   NEXT_PUBLIC_API_URL=https://$HEROKU_APP_NAME.herokuapp.com/api"
    echo
    echo "2. Monitor your app:"
    echo "   heroku logs --tail -a $HEROKU_APP_NAME"
    echo
    echo "3. Scale for production:"
    echo "   heroku ps:scale web=2 -a $HEROKU_APP_NAME"
    echo
    echo "4. Set up monitoring dashboard in your AWS console"
    echo
    print_success "Setup complete! Your app is ready for production."
}

# Main execution
main() {
    check_directory
    check_requirements
    get_configuration
    create_heroku_app
    setup_buildpacks
    setup_addons
    setup_aws_iam
    set_env_vars
    deploy_app
    print_summary
}

# Run main function
main "$@" 