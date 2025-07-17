#!/bin/bash

echo "🔧 Setting up and running Build Fix Service test..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the visualization-backend directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript files
echo "🔨 Building TypeScript files..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Run the test
echo "🧪 Running Build Fix Service test..."
node test-build-fix.js

echo "✅ Test completed!" 