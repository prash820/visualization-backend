# Quick Setup Guide - Fully Automated

The setup script now runs completely automatically with sensible defaults. No user input required!

## What You Need
- ✅ Heroku account
- ✅ AWS credentials (optional - can be set later)
- ✅ OpenAI API key (optional - can be set later)

## Setup Process

### 1. Check Current Configuration
```bash
./check-config.sh
```

### 2. Run Automated Setup
```bash
./setup-heroku-production.sh
```

That's it! The script will:
- ✅ Generate unique Heroku app name automatically
- ✅ Auto-detect AWS credential type (direct vs IAM role)
- ✅ Use sensible defaults for all configuration
- ✅ Create and deploy everything without prompts

## How It Works

### 🔄 **Automatic Credential Detection**
- **Has AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY?** → Uses direct credentials
- **No AWS credentials set?** → Uses IAM role approach with constant account ID

### 📋 **Default Values Used**
- **Heroku App**: `chart-app-1234567890` (unique timestamp)
- **AWS Region**: `us-east-1`
- **Frontend URL**: `https://your-app.vercel.app` (update after deployment)
- **JWT Secret**: Auto-generated securely

## Customization Options

### **Option 1: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export OPENAI_API_KEY="your-openai-key"
./setup-heroku-production.sh
```

### **Option 2: Inline Override**
```bash
HEROKU_APP_NAME="my-custom-app" FRONTEND_URL="https://my-app.vercel.app" ./setup-heroku-production.sh
```

### **Option 3: Edit Defaults**
```bash
# Edit setup-heroku-production.sh lines 9-15
DEFAULT_HEROKU_APP_NAME="my-preferred-name"
DEFAULT_FRONTEND_URL="https://my-frontend.com"
```

## What Happens During Setup

```
🔧 Current Configuration:
  • Heroku App: chart-app-1703123456
  • Frontend URL: https://your-app.vercel.app
  • AWS Region: us-east-1
  • Credential Type: IAM Role (or Direct if AWS keys set)
  • OpenAI API Key: ❌ Missing (can be set later)

🚀 Automated Steps:
  1. ✅ Create Heroku app with unique name
  2. ✅ Configure buildpacks (Node.js, Python, Terraform)
  3. ✅ Add required addons (PostgreSQL, Redis, Logging)
  4. ✅ Setup AWS IAM roles (if using role approach)
  5. ✅ Set all environment variables
  6. ✅ Deploy application to Heroku

📝 Result:
  • App URL: https://chart-app-1703123456.herokuapp.com
  • Ready to provision AWS infrastructure!
```

## After Setup

### **Set Missing API Keys (if needed)**
```bash
heroku config:set OPENAI_API_KEY="your-key" -a your-app-name
```

### **Update Frontend URL**
```bash
heroku config:set CORS_ORIGIN="https://your-actual-frontend.com" -a your-app-name
```

### **Test Deployment**
```bash
curl https://your-app-name.herokuapp.com/api/health
```

## Benefits of Automated Setup

| Before | After |
|--------|-------|
| ❌ 8+ manual prompts | ✅ Zero prompts |
| ❌ Risk of typos | ✅ Consistent defaults |
| ❌ Need to remember settings | ✅ Auto-generated values |
| ❌ Complex decision making | ✅ Smart auto-detection |

The setup is now fully streamlined - just run the script and get a working deployment! 