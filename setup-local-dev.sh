#!/bin/bash

# Setup script for local development
echo "🚀 Setting up local development environment..."

# Set environment variables for local development
export NODE_ENV=development
export PORT=5001
export BACKEND_URL=http://localhost:5001
export FRONTEND_URL=http://localhost:3000

echo "✅ Environment variables set:"
echo "   NODE_ENV=${NODE_ENV}"
echo "   PORT=${PORT}"
echo "   BACKEND_URL=${BACKEND_URL}"
echo "   FRONTEND_URL=${FRONTEND_URL}"

# Create a local config file that the frontend can use
cat > public/config.js << EOF
window.CONFIG = {
  BACKEND_URL: 'http://localhost:5001',
  ENVIRONMENT: 'development',
  IS_PRODUCTION: false,
  API_BASE_URL: 'http://localhost:5001/api'
};
EOF

echo "✅ Created public/config.js for frontend configuration"

# Start the backend server
echo "🚀 Starting backend server on port ${PORT}..."
npm run dev 