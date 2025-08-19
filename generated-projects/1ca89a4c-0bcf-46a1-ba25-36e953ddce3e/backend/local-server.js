#!/usr/bin/env node

/**
 * Local Development Server Wrapper for Serverless Applications
 * 
 * This file creates a local Express server that wraps the serverless handler,
 * allowing you to test serverless applications locally before deployment.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import the serverless handler
let handler;
try {
  // Try to import from dist first (built version)
  const distPath = path.join(__dirname, 'dist', 'index.js');
  if (require('fs').existsSync(distPath)) {
    const serverlessModule = require('./dist/index.js');
    handler = serverlessModule.handler;
    console.log('[LocalServer] Using built serverless handler from dist/');
  } else {
    // Fallback to source (development version)
    const srcPath = path.join(__dirname, 'src', 'index.ts');
    if (require('fs').existsSync(srcPath)) {
      // For TypeScript, we'll use ts-node
      require('ts-node/register');
      const serverlessModule = require('./src/index.ts');
      handler = serverlessModule.handler;
      console.log('[LocalServer] Using development serverless handler from src/');
    } else {
      throw new Error('No serverless handler found');
    }
  }
} catch (error) {
  console.error('[LocalServer] Error importing serverless handler:', error.message);
  process.exit(1);
}

if (!handler) {
  console.error('[LocalServer] No handler exported from serverless module');
  process.exit(1);
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    type: 'serverless-local'
  });
});

// Convert Express request to API Gateway event
function createApiGatewayEvent(req) {
  const event = {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    requestContext: {
      httpMethod: req.method,
      path: req.path,
      requestId: req.headers['x-request-id'] || 'local-dev-' + Date.now(),
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      stage: 'local',
      identity: {
        sourceIp: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'local-dev'
      }
    }
  };

  return event;
}

// Convert API Gateway response to Express response
function sendApiGatewayResponse(res, response) {
  const { statusCode, headers, body } = response;
  
  // Set status code
  res.status(statusCode);
  
  // Set headers
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });
  }
  
  // Set CORS headers for local development
  res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Send response
  if (body) {
    try {
      const parsedBody = JSON.parse(body);
      res.json(parsedBody);
    } catch (error) {
      res.send(body);
    }
  } else {
    res.end();
  }
}

// Handle all routes through serverless handler
app.use('*', async (req, res) => {
  try {
    console.log(`[LocalServer] ${req.method} ${req.path}`);
    
    // Create API Gateway event
    const event = createApiGatewayEvent(req);
    
    // Create context
    const context = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'local-dev',
      functionVersion: 'local',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:local-dev',
      memoryLimitInMB: '128',
      awsRequestId: event.requestContext.requestId,
      logGroupName: '/aws/lambda/local-dev',
      logStreamName: 'local-dev',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {}
    };
    
    // Call serverless handler
    const result = await handler(event, context);
    
    // Send response
    sendApiGatewayResponse(res, result);
    
  } catch (error) {
    console.error('[LocalServer] Error handling request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local serverless server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Type: Serverless Local Wrapper`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Logs will appear below...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[LocalServer] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[LocalServer] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
