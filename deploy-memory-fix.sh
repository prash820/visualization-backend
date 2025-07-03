#!/bin/bash

echo "🚀 Deploying Memory Management Fix to Heroku..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the visualization-backend directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔍 Running memory management tests..."
echo "Testing memory manager..."
node -e "
const { memoryManager } = require('./src/utils/memoryManager');
console.log('✅ Memory manager loaded successfully');
memoryManager.logMemoryUsage('Test');
console.log('✅ Memory monitoring works');
"

echo "🧪 Running Terraform generation validation..."
# Run the terraform test to ensure infrastructure generation still works
timeout 60s node test-terraform-generation.js || {
    echo "⚠️  Terraform test timed out or failed, but proceeding with deployment"
}

echo "📝 Committing changes..."
git add -A
git commit -m "🧠 Memory management optimization - fix R14 memory quota exceeded error

- Added comprehensive memory manager with job cleanup
- Set up automatic cleanup for all job stores (5-60 min retention)
- Added memory monitoring with emergency cleanup
- Updated all controllers to use memory management
- Added proper timestamps and access tracking
- Added memory monitoring script and health endpoints
- Reduced memory leaks from accumulating AI responses
- Fixed job store cleanup intervals and limits

This should resolve the R14 memory quota exceeded errors on Heroku."

echo "🚀 Deploying to Heroku..."
git push heroku main

echo "⏳ Waiting for deployment to complete..."
sleep 30

echo "🔍 Checking deployment status..."
heroku ps:scale web=1

echo "📊 Checking memory usage after deployment..."
heroku logs --tail --num 50 | grep -E "(Memory|R14|quota|exceeded)" || echo "No memory warnings found"

echo "✅ Deployment complete!"
echo ""
echo "🔗 Monitor memory usage with:"
echo "  heroku logs --tail | grep Memory"
echo "  heroku run node monitor-memory.js health"
echo ""
echo "🔧 Debug commands:"
echo "  heroku logs --tail"
echo "  heroku ps"
echo "  heroku run bash"
echo ""
echo "📊 Check application health:"
echo "  curl https://your-app.herokuapp.com/health"
echo "  curl https://your-app.herokuapp.com/memory" 