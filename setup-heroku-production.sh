#!/bin/bash

# Heroku Production Setup Script for Chart App
# This script sets up Heroku deployment with AWS integration for multi-tenant infrastructure provisioning
# Run this from the visualization-backend directory

# =============================================================================
# CONFIGURATION - Update these values for your environment
# =============================================================================
AWS_ACCOUNT_ID="413486338132"  # Replace with your actual AWS Account ID

# Default configuration values (update as needed)
DEFAULT_HEROKU_APP_NAME="chart-app-$(date +%s)"  # Unique app name with timestamp
DEFAULT_AWS_REGION="us-east-1"
DEFAULT_FRONTEND_URL="https://v0-image-analysis-gp-omega.vercel.app"  # Update with actual frontend URL
# Add your actual API keys here or set as environment variables
DEFAULT_OPENAI_API_KEY="${OPENAI_API_KEY}"  # Uses env var if set
DEFAULT_JWT_SECRET=""  # Will be auto-generated if empty

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
    
    HEROKU_APP_NAME=${HEROKU_APP_NAME:-$DEFAULT_HEROKU_APP_NAME}
    AWS_REGION=${AWS_REGION:-$DEFAULT_AWS_REGION}
    FRONTEND_URL=${FRONTEND_URL:-$DEFAULT_FRONTEND_URL}
    OPENAI_API_KEY=${OPENAI_API_KEY:-$DEFAULT_OPENAI_API_KEY}
    JWT_SECRET=${JWT_SECRET:-$DEFAULT_JWT_SECRET}
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        print_success "Generated JWT secret"
    fi
    
    # Auto-detect credential approach based on environment variables
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
        # Direct credentials available
        USE_DIRECT_CREDENTIALS=true
        print_success "Detected direct AWS credentials (Access Key/Secret)"
        print_success "Using AWS Region: $AWS_REGION"
    else
        # Use IAM role approach
        USE_DIRECT_CREDENTIALS=false
        print_success "No direct AWS credentials found, using IAM role approach"
        print_success "Using AWS Account ID: $AWS_ACCOUNT_ID (configured at top of script)"
        
        # Generate external ID for AWS role
        EXTERNAL_ID=$(openssl rand -base64 24)
        print_success "Generated AWS external ID: ${EXTERNAL_ID:0:12}..."
    fi
    
    # Display configuration summary
    echo
    print_status "Configuration Summary:"
    echo "  • Heroku App: $HEROKU_APP_NAME"
    echo "  • Frontend URL: $FRONTEND_URL"
    echo "  • AWS Region: $AWS_REGION"
    echo "  • Credential Type: $([ "$USE_DIRECT_CREDENTIALS" = "true" ] && echo "Direct" || echo "IAM Role")"
    echo "  • OpenAI API Key: $([ -n "$OPENAI_API_KEY" ] && echo "✅ Set" || echo "❌ Missing")"
    echo
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
    if [ "$USE_DIRECT_CREDENTIALS" = "true" ]; then
        print_status "Skipping AWS IAM role setup (using direct credentials)"
        print_warning "Note: Direct credentials are simpler but less secure for production"
        print_warning "Consider using IAM role assumption for production environments"
        return 0
    fi
    
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
    if [ "$USE_DIRECT_CREDENTIALS" = "true" ]; then
        # Direct credentials approach
        heroku config:set AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" -a $HEROKU_APP_NAME
        heroku config:set AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" -a $HEROKU_APP_NAME
        heroku config:set AWS_DEFAULT_REGION="$AWS_REGION" -a $HEROKU_APP_NAME
        print_success "Set direct AWS credentials"
    else
        # IAM role assumption approach
        heroku config:set AWS_REGION=us-east-1 -a $HEROKU_APP_NAME
        heroku config:set AWS_ROLE_ARN="$ROLE_ARN" -a $HEROKU_APP_NAME
        heroku config:set AWS_EXTERNAL_ID="$EXTERNAL_ID" -a $HEROKU_APP_NAME
        heroku config:set AWS_SESSION_NAME=chart-app-heroku-session -a $HEROKU_APP_NAME
        print_success "Set AWS role assumption credentials"
    fi
    
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
print_completion() {
    echo "🎉 Heroku deployment setup complete!"
    echo
    echo "📝 Summary:"
    echo "  • Heroku app: $HEROKU_APP_NAME"
    echo "  • App URL: https://$HEROKU_APP_NAME.herokuapp.com"
    echo "  • Frontend URL: $FRONTEND_URL"
    
    if [ "$USE_DIRECT_CREDENTIALS" = "true" ]; then
        echo "  • AWS Credentials: Direct access key/secret"
        echo "  • AWS Region: $AWS_REGION"
    else
        echo "  • AWS Role ARN: $ROLE_ARN"
        echo "  • AWS External ID: $EXTERNAL_ID"
    fi
    
    echo
    echo "🚀 Next steps:"
    echo "  1. Verify deployment: heroku logs --tail -a $HEROKU_APP_NAME"
    echo "  2. Test the API: curl https://$HEROKU_APP_NAME.herokuapp.com/api/health"
    echo "  3. Update your frontend to use: https://$HEROKU_APP_NAME.herokuapp.com"
    echo
    
    if [ "$USE_DIRECT_CREDENTIALS" = "false" ]; then
        echo "🔐 AWS Role Setup Complete:"
        echo "  • Role ARN: $ROLE_ARN"
        echo "  • External ID: $EXTERNAL_ID"
        echo "  • This role allows your Heroku app to provision AWS resources"
        echo
    fi
    
    echo "📊 Resource Limits (configured):"
    echo "  • Max projects per user: 10"
    echo "  • Max cost per project: $50"
    echo "  • Max total cost per user: $100"
    echo "  • Resource timeout: 60 minutes"
    echo
    echo "🔧 Management commands:"
    echo "  • heroku logs --tail -a $HEROKU_APP_NAME"
    echo "  • heroku ps:scale web=1 terraform=1 -a $HEROKU_APP_NAME"
    echo "  • heroku config -a $HEROKU_APP_NAME"
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
    print_completion
}

# Run main function
main "$@" 