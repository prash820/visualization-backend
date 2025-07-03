# Resource Management API Documentation

## Overview

The Resource Management API provides comprehensive visibility into all deployed AWS resources, their deployment status, and associated costs. This API gives users complete transparency into their infrastructure and helps manage costs effectively.

## 🎯 Key Features

- **Complete Resource Visibility**: See all workspaces and their deployment status
- **Cost Transparency**: Get estimated monthly costs for all resources
- **Deployment Status Tracking**: Understand if resources are active, failed, or orphaned
- **Category Filtering**: Filter resources by deployment status
- **Cost Breakdown**: See costs broken down by source (Magic App Builder, Test Projects, etc.)
- **Real-time Status**: Get up-to-date information about resource states

## 📊 API Endpoints

### 1. **Get Resources Overview**

```bash
GET /api/magic/resources/overview
```

**Description**: Get comprehensive overview of all resources with cost and deployment status.

**Response Structure**:
```json
{
  "resources": [
    {
      "projectId": "magic-demo-1234567890",
      "workspaceType": "magic",
      "source": "Magic App Builder",
      "deploymentStatus": "active",
      "resourceCount": 5,
      "resourceTypes": {
        "aws_s3_bucket": 1,
        "aws_lambda_function": 1,
        "aws_api_gateway_rest_api": 1
      },
      "outputs": {
        "s3_website_url": "http://demo-app-bucket.s3-website-us-east-1.amazonaws.com",
        "api_gateway_url": "https://abc123def.execute-api.us-east-1.amazonaws.com/prod"
      },
      "hasLiveResources": true,
      "estimatedMonthlyCost": 30,
      "createdAt": "2025-07-03T19:13:57.745Z",
      "ageInHours": 2.5,
      "ageInDays": 0,
      "actions": {
        "details": "/api/magic/workspace/magic-demo-1234567890",
        "cleanup": "/api/magic/cleanup/magic-demo-1234567890",
        "console": "https://console.aws.amazon.com/console/home?region=us-east-1"
      }
    }
  ],
  "summary": {
    "total": 2,
    "active": 1,
    "provisioned": 2,
    "deploymentFailed": 1,
    "orphaned": 0,
    "incomplete": 0
  },
  "costEstimate": {
    "monthly": 50,
    "breakdown": {
      "Magic App Builder": 30,
      "Test Project": 20
    }
  },
  "lastUpdated": "2025-07-03T19:14:04.778Z"
}
```

### 2. **Get Resources by Category**

```bash
GET /api/magic/resources/category/{category}
```

**Description**: Filter resources by deployment status category.

**Available Categories**:
- `active` - Resources with successful deployments and working apps
- `provisioned` - All resources that have been provisioned (regardless of app status)
- `failed` - Resources provisioned but app deployment failed
- `orphaned` - Resources provisioned but no app deployed
- `incomplete` - Workspaces without live resources
- `costly` - Resources with estimated monthly costs > $0

**Response Structure**:
```json
{
  "category": "active",
  "resources": [...],
  "count": 1,
  "totalCost": 30
}
```

## 🏷️ Deployment Status Categories

### **Active** 🟢
- **Status**: `active`
- **Description**: Resources are provisioned and app is successfully deployed
- **Characteristics**: Has terraform outputs (website URL, API URL)
- **Action**: None needed - these are working apps

### **Deployment Failed** 🔴
- **Status**: `deployment_failed`
- **Description**: AWS resources provisioned but app deployment failed
- **Characteristics**: Has AWS resources but no terraform outputs
- **Action**: Investigate deployment logs or cleanup if not needed

### **Provisioned (No App)** 🟡
- **Status**: `provisioned_no_app`
- **Description**: Resources exist but no application deployed
- **Characteristics**: Has AWS resources but no successful app deployment
- **Action**: Complete deployment or cleanup

### **Orphaned** 🟠
- **Status**: `orphaned`
- **Description**: Resources exist but not tracked by application
- **Characteristics**: Similar to provisioned but from failed deployments
- **Action**: Clean up to avoid ongoing costs

### **Incomplete** ⚪
- **Status**: `incomplete`
- **Description**: Workspace exists but no resources provisioned
- **Characteristics**: Directory exists but no terraform state or empty state
- **Action**: Safe to clean up - no AWS costs

### **Corrupted State** 🔴
- **Status**: `corrupted_state`
- **Description**: Terraform state file exists but cannot be parsed
- **Characteristics**: Invalid JSON or corrupted state file
- **Action**: Manual investigation needed

## 💰 Cost Estimation

### **Cost Estimates by Resource Type**

| Resource Type | Monthly Cost | Notes |
|---------------|--------------|-------|
| `aws_lambda_function` | $5 | Minimal usage assumed |
| `aws_s3_bucket` | $10 | Small website storage |
| `aws_api_gateway_rest_api` | $5 | Minimal API calls |
| `aws_dynamodb_table` | $25 | Small table with minimal reads/writes |
| `aws_iam_role` | $0 | Free |
| `aws_iam_policy` | $0 | Free |
| Other AWS resources | $5 | Default estimate |

### **Cost Breakdown Structure**

```json
{
  "costEstimate": {
    "monthly": 75,
    "breakdown": {
      "Magic App Builder": 50,
      "Test Project": 20,
      "General Project": 5
    }
  }
}
```

## 🔍 Resource Information

### **Resource Object Fields**

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | string | Unique workspace identifier |
| `workspaceType` | string | Type: `magic`, `test`, `uuid`, `unknown` |
| `source` | string | Human-readable source name |
| `deploymentStatus` | string | Current deployment status |
| `resourceCount` | number | Number of AWS resources |
| `resourceTypes` | object | Count of each resource type |
| `outputs` | object | Terraform outputs (URLs, names) |
| `hasLiveResources` | boolean | Whether AWS resources exist |
| `estimatedMonthlyCost` | number | Monthly cost estimate in USD |
| `createdAt` | string | ISO timestamp of creation |
| `ageInHours` | number | Age in hours |
| `ageInDays` | number | Age in days |
| `actions` | object | Available actions for this resource |

### **Summary Object Fields**

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of workspaces |
| `active` | number | Active deployments |
| `provisioned` | number | Workspaces with AWS resources |
| `deploymentFailed` | number | Failed deployments |
| `orphaned` | number | Orphaned resources |
| `incomplete` | number | Incomplete workspaces |

## 🚀 Usage Examples

### **Frontend Integration**

```javascript
// Get complete overview
const overview = await fetch('/api/magic/resources/overview').then(r => r.json());

// Display cost information
console.log(`Monthly Cost: $${overview.costEstimate.monthly}`);
console.log(`Active Apps: ${overview.summary.active}`);
console.log(`Failed Deployments: ${overview.summary.deploymentFailed}`);

// Get only resources that are costing money
const costlyResources = await fetch('/api/magic/resources/category/costly')
  .then(r => r.json());

// Get failed deployments for cleanup
const failedDeployments = await fetch('/api/magic/resources/category/failed')
  .then(r => r.json());
```

### **Dashboard Components**

```javascript
// Cost Dashboard
function CostDashboard() {
  const [resources, setResources] = useState(null);
  
  useEffect(() => {
    fetch('/api/magic/resources/overview')
      .then(r => r.json())
      .then(setResources);
  }, []);
  
  return (
    <div>
      <h2>Monthly Cost: ${resources?.costEstimate?.monthly || 0}</h2>
      <div>Active Apps: {resources?.summary?.active || 0}</div>
      <div>Failed Deployments: {resources?.summary?.deploymentFailed || 0}</div>
    </div>
  );
}

// Resource Status List
function ResourceStatusList() {
  const [resources, setResources] = useState([]);
  
  useEffect(() => {
    fetch('/api/magic/resources/overview')
      .then(r => r.json())
      .then(data => setResources(data.resources));
  }, []);
  
  return (
    <div>
      {resources.map(resource => (
        <div key={resource.projectId}>
          <h3>{resource.projectId}</h3>
          <span>Status: {resource.deploymentStatus}</span>
          <span>Cost: ${resource.estimatedMonthlyCost}/month</span>
          <span>Age: {resource.ageInDays} days</span>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Management Actions

### **Available Actions per Resource**

```json
{
  "actions": {
    "details": "/api/magic/workspace/magic-demo-1234567890",
    "cleanup": "/api/magic/cleanup/magic-demo-1234567890",
    "console": "https://console.aws.amazon.com/console/home?region=us-east-1"
  }
}
```

### **Cleanup Recommendations**

| Status | Urgency | Recommendation |
|--------|---------|----------------|
| `active` | None | Keep - this is working |
| `deployment_failed` | High | Cleanup if not needed |
| `provisioned_no_app` | Medium | Complete deployment or cleanup |
| `orphaned` | High | Cleanup to avoid costs |
| `incomplete` | Low | Safe to cleanup |

## 📱 Frontend UI Suggestions

### **Resource Dashboard Layout**

```
┌─────────────────────────────────────────────────────┐
│                 Resource Dashboard                  │
├─────────────────────────────────────────────────────┤
│  💰 Monthly Cost: $75    📊 Total Resources: 8     │
│  🟢 Active: 3           🔴 Failed: 2               │
│  🟡 Provisioned: 5      ⚪ Incomplete: 1           │
├─────────────────────────────────────────────────────┤
│  Filter: [All] [Active] [Failed] [Costly] [Old]    │
├─────────────────────────────────────────────────────┤
│  📋 Resource List                                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🟢 magic-demo-1234567890                       │ │
│  │    Active • $30/month • 5 resources • 2 days   │ │
│  │    [View App] [Details] [Console]               │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 🔴 magic-failed-9876543210                     │ │
│  │    Failed • $20/month • 3 resources • 1 hour   │ │
│  │    [Retry] [Cleanup] [Console]                  │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### **Cost Breakdown Chart**

```javascript
// Pie chart data for cost breakdown
const costChartData = {
  labels: Object.keys(overview.costEstimate.breakdown),
  datasets: [{
    data: Object.values(overview.costEstimate.breakdown),
    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
  }]
};
```

## 🔄 Real-time Updates

### **Polling for Updates**

```javascript
// Poll for updates every 30 seconds
setInterval(async () => {
  const overview = await fetch('/api/magic/resources/overview').then(r => r.json());
  updateResourcesDashboard(overview);
}, 30000);
```

### **WebSocket Integration** (Future Enhancement)

```javascript
// Future: Real-time updates via WebSocket
const ws = new WebSocket('ws://localhost:5001/resources');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateResourcesDashboard(update);
};
```

## 🛡️ Security Considerations

- **API Access**: Ensure proper authentication for resource management endpoints
- **Cost Information**: Sensitive financial data - consider access controls
- **Cleanup Actions**: Destructive operations should require confirmation
- **AWS Console Links**: Direct links to AWS console for manual management

## 🔍 Troubleshooting

### **Common Issues**

1. **Missing Resources**: Check if terraform state files exist
2. **Incorrect Costs**: Verify resource type cost estimates
3. **Wrong Status**: Check terraform outputs and deployment logs
4. **API Errors**: Ensure terraform service is running on port 8000

### **Debug Commands**

```bash
# Check API health
curl http://localhost:5001/api/magic/resources/overview

# Check specific category
curl http://localhost:5001/api/magic/resources/category/active

# Check workspace details
curl http://localhost:5001/api/magic/workspace/{projectId}
```

This comprehensive Resource Management API provides complete visibility into your infrastructure, helping you manage costs and ensure efficient resource utilization. 