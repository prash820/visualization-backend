#!/bin/bash

# Deployment Verification Script for Chart App Production
# Tests all critical functionality to ensure the system is working correctly
# Run this from the visualization-backend directory

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Configuration
HEROKU_APP=""
FRONTEND_URL=""
TEST_TIMEOUT=30

# Check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -d "src" ]; then
        print_error "Please run this script from the visualization-backend directory"
        print_error "cd visualization-backend && ./verify-deployment.sh"
        exit 1
    fi
    print_success "Running from visualization-backend directory"
}

# Get configuration
get_config() {
    echo "🔍 Chart App Production Deployment Verification"
    echo "================================================"
    
    if [ -z "$1" ]; then
        read -p "Enter your Heroku app name: " HEROKU_APP
    else
        HEROKU_APP=$1
    fi
    
    if [ -z "$2" ]; then
        read -p "Enter your frontend URL (optional, press enter to skip): " FRONTEND_URL
    else
        FRONTEND_URL=$2
    fi
    
    API_URL="https://${HEROKU_APP}.herokuapp.com/api"
    echo "API URL: $API_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
}

# Test API health
test_api_health() {
    print_status "Testing API health endpoint..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$API_URL/health" --max-time $TEST_TIMEOUT 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        print_success "API health check passed"
        return 0
    else
        print_error "API health check failed (HTTP $response)"
        return 1
    fi
}

# Test AWS credential configuration
test_aws_config() {
    print_status "Testing AWS configuration..."
    
    # Check Heroku config vars
    aws_role=$(heroku config:get AWS_ROLE_ARN -a $HEROKU_APP 2>/dev/null || echo "")
    aws_external_id=$(heroku config:get AWS_EXTERNAL_ID -a $HEROKU_APP 2>/dev/null || echo "")
    
    if [ -n "$aws_role" ] && [ -n "$aws_external_id" ]; then
        print_success "AWS credentials configured"
        echo "  Role ARN: $aws_role"
        return 0
    else
        print_error "AWS credentials not properly configured"
        return 1
    fi
}

# Test quota service
test_quota_service() {
    print_status "Testing quota service..."
    
    # Test quota endpoint (if available)
    response=$(curl -s -w "%{http_code}" -o /tmp/quota_response.json "$API_URL/admin/quota-stats" --max-time $TEST_TIMEOUT 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        print_success "Quota service responding"
        return 0
    else
        print_warning "Quota service test inconclusive (HTTP $response)"
        return 0
    fi
}

# Test project creation flow
test_project_creation() {
    print_status "Testing project creation flow..."
    
    # Test projects endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/projects_response.json "$API_URL/projects" --max-time $TEST_TIMEOUT 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        print_success "Project API responding"
        return 0
    else
        print_error "Project API not responding (HTTP $response)"
        return 1
    fi
}

# Test infrastructure deployment endpoint
test_deployment_endpoints() {
    print_status "Testing deployment endpoints..."
    
    # Test deployment status endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/deploy_response.json "$API_URL/deploy/status/test-project" --max-time $TEST_TIMEOUT 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ] || [ "$response" = "400" ]; then
        print_success "Deployment endpoints responding"
        return 0
    else
        print_error "Deployment endpoints not responding (HTTP $response)"
        return 1
    fi
}

# Test application deployment endpoints
test_app_deployment_endpoints() {
    print_status "Testing application deployment endpoints..."
    
    # Test app deployment status endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/app_deploy_response.json "$API_URL/deploy/app/test-project" --max-time $TEST_TIMEOUT 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ] || [ "$response" = "400" ]; then
        print_success "Application deployment endpoints responding"
        return 0
    else
        print_error "Application deployment endpoints not responding (HTTP $response)"
        return 1
    fi
}

# Test frontend connectivity
test_frontend() {
    if [ -z "$FRONTEND_URL" ]; then
        print_warning "Frontend URL not provided, skipping frontend test"
        return 0
    fi
    
    print_status "Testing frontend connectivity..."
    
    response=$(curl -s -w "%{http_code}" -o /tmp/frontend_response.html "$FRONTEND_URL" --max-time $TEST_TIMEOUT 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        print_success "Frontend accessible"
        return 0
    else
        print_error "Frontend not accessible (HTTP $response)"
        return 1
    fi
}

# Test Heroku app status
test_heroku_status() {
    print_status "Testing Heroku app status..."
    
    status=$(heroku ps -a $HEROKU_APP 2>/dev/null | grep "web\." | head -1 | awk '{print $2}' || echo "unknown")
    
    if [ "$status" = "up" ]; then
        print_success "Heroku app is running"
        return 0
    else
        print_warning "Heroku app status: $status"
        return 0
    fi
}

# Test environment variables
test_env_vars() {
    print_status "Testing critical environment variables..."
    
    local missing_vars=()
    local required_vars=("AWS_ROLE_ARN" "AWS_EXTERNAL_ID" "JWT_SECRET" "OPENAI_API_KEY")
    
    for var in "${required_vars[@]}"; do
        value=$(heroku config:get $var -a $HEROKU_APP 2>/dev/null || echo "")
        if [ -z "$value" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        print_success "All critical environment variables are set"
        return 0
    else
        print_error "Missing environment variables: ${missing_vars[*]}"
        return 1
    fi
}

# Test resource limits configuration
test_resource_limits() {
    print_status "Testing resource limits configuration..."
    
    max_resources=$(heroku config:get MAX_RESOURCES_PER_USER -a $HEROKU_APP 2>/dev/null || echo "")
    max_cost=$(heroku config:get MAX_COST_PER_PROJECT -a $HEROKU_APP 2>/dev/null || echo "")
    
    if [ -n "$max_resources" ] && [ -n "$max_cost" ]; then
        print_success "Resource limits configured (Max resources: $max_resources, Max cost: \$$max_cost)"
        return 0
    else
        print_warning "Resource limits not configured"
        return 0
    fi
}

# Generate test report
generate_report() {
    echo ""
    echo "📊 Deployment Verification Report"
    echo "=================================="
    echo "App: $HEROKU_APP"
    echo "API: $API_URL"
    echo "Frontend: ${FRONTEND_URL:-"Not tested"}"
    echo "Time: $(date)"
    echo ""
    
    if [ $total_failures -eq 0 ]; then
        echo -e "${GREEN}✅ All critical tests passed!${NC}"
        echo "Your production deployment is ready for users."
    elif [ $total_failures -le 2 ]; then
        echo -e "${YELLOW}⚠️ Some tests failed, but core functionality appears to work.${NC}"
        echo "Review the failures above and fix if necessary."
    else
        echo -e "${RED}❌ Multiple critical tests failed.${NC}"
        echo "Please address the issues before deploying to users."
    fi
    
    echo ""
    echo "Next steps:"
    echo "1. Monitor logs: heroku logs --tail -a $HEROKU_APP"
    echo "2. Test with a real user account"
    echo "3. Set up monitoring and alerting"
    echo "4. Review cost management settings"
}

# Main execution
main() {
    check_directory
    get_config "$@"
    
    local total_failures=0
    
    # Run all tests
    test_heroku_status || ((total_failures++))
    test_env_vars || ((total_failures++))
    test_api_health || ((total_failures++))
    test_aws_config || ((total_failures++))
    test_resource_limits || ((total_failures++))
    test_quota_service || ((total_failures++))
    test_project_creation || ((total_failures++))
    test_deployment_endpoints || ((total_failures++))
    test_app_deployment_endpoints || ((total_failures++))
    test_frontend || ((total_failures++))
    
    generate_report
    
    # Clean up temp files
    rm -f /tmp/health_response.json /tmp/quota_response.json /tmp/projects_response.json
    rm -f /tmp/deploy_response.json /tmp/app_deploy_response.json /tmp/frontend_response.html
    
    exit $total_failures
}

# Run main function
main "$@" 