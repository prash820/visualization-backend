#!/bin/bash

# Magic App Builder - Orphaned Resources Management Script
# This script helps manage AWS resources that were created but not properly tracked

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:5001"
API_BASE="$SERVER_URL/api/magic"

# Helper functions
print_header() {
    echo -e "${BLUE}==========================================${NC}"
    echo -e "${BLUE}  Magic App Builder - Orphaned Resources${NC}"
    echo -e "${BLUE}==========================================${NC}"
    echo
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_server() {
    if ! curl -s "$SERVER_URL/health" > /dev/null 2>&1; then
        print_error "Server is not running on $SERVER_URL"
        print_info "Please start the server with: npm run dev"
        exit 1
    fi
}

list_orphaned_resources() {
    print_info "Checking for orphaned resources..."
    echo
    
    response=$(curl -s "$API_BASE/orphaned-resources")
    
    total=$(echo "$response" | jq -r '.total')
    totalWithResources=$(echo "$response" | jq -r '.totalWithResources')
    totalEmpty=$(echo "$response" | jq -r '.totalEmpty')
    totalNoState=$(echo "$response" | jq -r '.totalNoState')
    
    if [ "$total" -eq 0 ]; then
        print_success "No orphaned resources found!"
        return
    fi
    
    echo "=== ORPHANED RESOURCES SUMMARY ==="
    echo
    
    if [ "$totalWithResources" -gt 0 ]; then
        print_error "🚨 URGENT: $totalWithResources workspace(s) with ACTIVE AWS resources (costing money!)"
        echo "$response" | jq -r '.resourceWorkspaces[] | "  ❌ \(.projectId) (\(.workspaceType)) - \(.resourceCount) resources, Age: \(.ageInHours)h"'
        echo
    fi
    
    if [ "$totalEmpty" -gt 0 ]; then
        print_warning "📁 $totalEmpty workspace(s) with empty Terraform state (safe to clean)"
        echo "$response" | jq -r '.emptyWorkspaces[] | "  📁 \(.projectId) (\(.workspaceType)) - Empty state, Age: \(.ageInHours)h"'
        echo
    fi
    
    if [ "$totalNoState" -gt 0 ]; then
        print_info "📂 $totalNoState workspace(s) without Terraform state (safe to clean)"
        echo "$response" | jq -r '.noStateWorkspaces[] | "  📂 \(.projectId) (\(.workspaceType)) - No state, Age: \(.ageInHours)h"'
        echo
    fi
    
    # Cost warning if any resources exist
    if [ "$totalWithResources" -gt 0 ]; then
        print_error "💰 Estimated monthly cost: $$(($totalWithResources * 30))-$$(($totalWithResources * 50))"
        echo
    fi
    
    echo "Available actions:"
    echo "  ./manage-orphaned-resources.sh cleanup <project-id>     # Clean up specific resource"
    echo "  ./manage-orphaned-resources.sh cleanup-all             # Clean up ALL resources (dangerous)"
    echo "  ./manage-orphaned-resources.sh details <project-id>    # Get detailed information"
    
    # Show detailed JSON if requested
    if [ "${2:-}" = "--json" ]; then
        echo
        echo "=== DETAILED JSON ==="
        echo "$response" | jq '.'
    fi
}

get_resource_details() {
    local project_id="$1"
    
    if [ -z "$project_id" ]; then
        print_error "Project ID is required"
        echo "Usage: $0 details <project-id>"
        exit 1
    fi
    
    print_info "Getting details for $project_id..."
    echo
    
    response=$(curl -s "$API_BASE/workspace/$project_id")
    echo "$response" | jq '.'
}

cleanup_resource() {
    local project_id="$1"
    
    if [ -z "$project_id" ]; then
        print_error "Project ID is required"
        echo "Usage: $0 cleanup <project-id>"
        exit 1
    fi
    
    print_warning "This will DESTROY AWS resources for $project_id"
    print_info "This action cannot be undone!"
    echo
    
    read -p "Are you sure you want to destroy $project_id? (type 'yes' to confirm): " confirmation
    
    if [ "$confirmation" != "yes" ]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
    
    print_info "Destroying AWS resources for $project_id..."
    echo
    
    response=$(curl -s -X DELETE "$API_BASE/cleanup/$project_id")
    echo "$response" | jq '.'
    
    status=$(echo "$response" | jq -r '.message // .error')
    if echo "$response" | jq -e '.message' > /dev/null; then
        print_success "Cleanup completed successfully"
    else
        print_error "Cleanup failed: $status"
    fi
}

cleanup_all_resources() {
    print_error "⚠️  DANGER: This will destroy ALL orphaned resources!"
    print_warning "This will PERMANENTLY DELETE all orphaned AWS resources"
    print_info "This action cannot be undone and may delete working applications!"
    echo
    
    # First show what will be deleted
    print_info "Resources that will be destroyed:"
    response=$(curl -s "$API_BASE/orphaned-resources")
    total=$(echo "$response" | jq -r '.total')
    
    if [ "$total" -eq 0 ]; then
        print_success "No orphaned resources found to clean up"
        exit 0
    fi
    
    echo "$response" | jq -r '.orphanedResources[] | "  - \(.projectId) (Age: \(.ageInHours)h, Resources: \(.resourceCount))"'
    echo
    
    print_warning "This will destroy $total workspace(s) and all their AWS resources"
    echo
    
    read -p "Type 'YES_DESTROY_ALL_ORPHANED_RESOURCES' to confirm: " confirmation
    
    if [ "$confirmation" != "YES_DESTROY_ALL_ORPHANED_RESOURCES" ]; then
        print_info "Bulk cleanup cancelled"
        exit 0
    fi
    
    print_info "Destroying ALL orphaned resources..."
    echo
    
    response=$(curl -s -X POST "$API_BASE/cleanup-all" \
        -H "Content-Type: application/json" \
        -d "{\"confirm\": \"YES_DESTROY_ALL_ORPHANED_RESOURCES\"}")
    
    echo "$response" | jq '.'
    
    cleaned=$(echo "$response" | jq -r '.totalCleaned // 0')
    failed=$(echo "$response" | jq -r '.totalFailed // 0')
    
    if [ "$cleaned" -gt 0 ]; then
        print_success "Successfully cleaned up $cleaned resources"
    fi
    
    if [ "$failed" -gt 0 ]; then
        print_error "$failed resources failed to clean up"
        print_info "You may need to manually clean these up in AWS Console"
    fi
}

show_help() {
    print_header
    echo "Usage: $0 <command> [arguments]"
    echo
    echo "Commands:"
    echo "  list                          List all orphaned resources"
    echo "  details <project-id>          Get detailed information about a workspace"
    echo "  cleanup <project-id>          Clean up specific orphaned resource"
    echo "  cleanup-all                   Clean up ALL orphaned resources (dangerous)"
    echo "  help                         Show this help message"
    echo
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 details magic-1234567890"
    echo "  $0 cleanup magic-1234567890"
    echo "  $0 cleanup-all"
    echo
    echo "API Endpoints:"
    echo "  GET  $API_BASE/orphaned-resources"
    echo "  GET  $API_BASE/workspace/<project-id>"
    echo "  DEL  $API_BASE/cleanup/<project-id>"
    echo "  POST $API_BASE/cleanup-all"
    echo
}

# Main script logic
case "${1:-help}" in
    "list")
        print_header
        check_server
        list_orphaned_resources
        ;;
    "details")
        print_header
        check_server
        get_resource_details "$2"
        ;;
    "cleanup")
        print_header
        check_server
        cleanup_resource "$2"
        ;;
    "cleanup-all")
        print_header
        check_server
        cleanup_all_resources
        ;;
    "help"|*)
        show_help
        ;;
esac 