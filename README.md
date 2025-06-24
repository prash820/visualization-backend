# Visualization Backend - Multi-Tenant AWS Infrastructure Provisioning

A production-ready Node.js backend service that enables users to create applications from prompts by automatically provisioning AWS infrastructure and deploying application code.

## 🏗️ Architecture

This backend service provides:
- **Multi-tenant AWS provisioning** with user isolation
- **Infrastructure & application deployment separation**
- **Cost controls and resource monitoring**
- **Secure AWS STS role assumption**
- **Terraform execution via Python integration**

## 🚀 Quick Deployment to Heroku

**Fully automated setup - zero user prompts required!**

```bash
# 1. Check configuration (optional)
./check-config.sh

# 2. Test what setup would do (optional)
./test-config.sh

# 3. Run automated setup (no input required!)
./setup-heroku-production.sh
```

The setup script automatically:
- ✅ Generates unique Heroku app name with timestamp
- ✅ Auto-detects AWS credential approach (direct vs IAM role)
- ✅ Uses sensible defaults for all configuration
- ✅ Creates and deploys everything without any prompts

## 🔧 Project Structure

```
visualization-backend/
├── src/                       # TypeScript source code
│   ├── controllers/           # API route handlers
│   ├── services/              # Business logic services
│   ├── config/                # AWS & app configuration
│   └── utils/                 # Utility functions
├── terraform-runner/          # Python Terraform execution
│   ├── main.py               # FastAPI service
│   ├── deploy.py             # Terraform operations
│   └── requirements.txt      # Python dependencies
├── dist/                     # Compiled JavaScript
├── Procfile                  # Heroku process configuration
├── package.json              # Node.js dependencies & scripts
└── setup-heroku-production.sh # Deployment automation
```

## 🔐 Security Features

- **AWS STS Role Assumption**: Temporary credentials per user/project
- **Resource Tagging**: Complete isolation between users
- **Cost Limits**: Per-user and per-project spending controls
- **Rate Limiting**: API protection and abuse prevention
- **Input Validation**: All user inputs sanitized and validated

## 🎯 API Endpoints

### Infrastructure Management
- `POST /api/deploy` - Deploy infrastructure via Terraform
- `DELETE /api/deploy` - Destroy infrastructure
- `GET /api/deploy/status/:projectId` - Get deployment status

### Application Deployment
- `POST /api/deploy/app` - Deploy application to infrastructure
- `POST /api/deploy/app/retry` - Retry failed application deployment
- `DELETE /api/deploy/app/purge` - Remove application from infrastructure

### Project Management
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details

## 🛠️ Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/ChartAppHerokuRole
AWS_EXTERNAL_ID=<generated-secret>

# Application Configuration
NODE_ENV=production
PORT=5001
TERRAFORM_PORT=8000

# Security
JWT_SECRET=<generated-secret>
CORS_ORIGIN=https://your-frontend.vercel.app

# Resource Limits
MAX_RESOURCES_PER_USER=10
MAX_COST_PER_PROJECT=50
MAX_TOTAL_COST_PER_USER=100
RESOURCE_TIMEOUT_MINUTES=60

# External Services
OPENAI_API_KEY=<your-key>
```

## 🏃‍♂️ Local Development

```bash
# Install dependencies
npm install

# Setup Python environment for terraform-runner
cd terraform-runner
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cd ..

# Start development server
npm run dev
```

## 🔄 Terraform Integration

The `terraform-runner/` directory contains a Python FastAPI service that handles:
- Terraform initialization and execution
- AWS resource provisioning
- Infrastructure state management
- Resource cleanup and destruction

This runs as a separate process (`terraform` in Procfile) alongside the main Node.js application.

## 📊 Cost Management

### User Quotas
- Maximum 10 projects per user
- Maximum $50 per project monthly cost
- Maximum $100 total cost per user

### Automatic Cleanup
- Resources auto-delete after 60 minutes of inactivity
- Failed deployments are automatically cleaned up
- Empty S3 buckets before infrastructure destruction

## 🚨 Monitoring & Logging

```bash
# Heroku logs
heroku logs --tail -a your-app-name

# Application health check
curl https://your-app.herokuapp.com/api/health

# Terraform service health
curl https://your-app.herokuapp.com:8000/health
```

## 🔧 Production Scaling

```bash
# Scale web dynos for more users
heroku ps:scale web=3 -a your-app-name

# Add database for persistence
heroku addons:create heroku-postgresql:standard-0

# Add Redis for caching
heroku addons:create heroku-redis:premium-0
```

## 📚 Related Documentation

- `PRODUCTION-SETUP.md` - Complete production deployment guide
- `heroku-deployment.md` - Detailed Heroku configuration
- `verify-deployment.sh` - Deployment verification script

## 🤝 Frontend Integration

This backend is designed to work with the companion Next.js frontend. Set the frontend's API URL to:
```
NEXT_PUBLIC_API_URL=https://your-heroku-app.herokuapp.com/api
```

## 🆘 Troubleshooting

### Common Issues

1. **AWS Permissions**: Verify IAM role and external ID configuration
2. **Terraform Failures**: Check AWS credentials and regional restrictions
3. **Build Failures**: Ensure all dependencies are in package.json
4. **High Costs**: Review resource cleanup settings and user quotas

### Support Commands

```bash
# Check app status
heroku ps -a your-app-name

# View configuration
heroku config -a your-app-name

# Restart application
heroku restart -a your-app-name
```

## ⚙️ Configuration

### AWS Account ID Setup
The script uses a constant AWS Account ID for IAM role creation. Update this once:

```bash
# Edit setup-heroku-production.sh, line 9:
AWS_ACCOUNT_ID="123456789012"  # Replace with your actual account ID

# Check current configuration:
./check-config.sh
```

This simplifies setup by not asking for the account ID every time you run the script.

This backend service provides a complete multi-tenant AWS infrastructure provisioning platform, ready for production use with proper security, cost controls, and scalability. 