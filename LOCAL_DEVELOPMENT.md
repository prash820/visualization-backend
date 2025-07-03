# Local Development Setup Guide

This guide helps you set up the Chart AI backend for local development, ensuring the frontend uses `localhost:5001` instead of the Heroku production URL.

## 🚀 Quick Start

### Option 1: Using the Setup Script
```bash
# Make the script executable (if not already)
chmod +x setup-local-dev.sh

# Run the setup script
./setup-local-dev.sh
```

### Option 2: Manual Setup

1. **Set Environment Variables:**
```bash
export NODE_ENV=development
export PORT=5001
export BACKEND_URL=http://localhost:5001
export FRONTEND_URL=http://localhost:3000
```

2. **Start the Backend Server:**
```bash
npm run dev
```

3. **Configure Frontend:**
   - The backend serves a dynamic config at: `http://localhost:5001/config.js`
   - Add this script tag to your frontend HTML:
   ```html
   <script src="http://localhost:5001/config.js"></script>
   ```

## 📋 Configuration Endpoints

### 1. JSON Config API
- **URL:** `http://localhost:5001/api/config`
- **Method:** GET
- **Response:**
```json
{
  "backendUrl": "http://localhost:5001",
  "environment": "development",
  "isProduction": false,
  "corsAllowed": true,
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 2. JavaScript Config
- **URL:** `http://localhost:5001/config.js`
- **Method:** GET
- **Response:** JavaScript file that sets `window.CONFIG`

## 🔧 Frontend Integration

### React/JavaScript Frontend
Include the config script in your frontend:

```html
<!-- In your HTML head -->
<script src="http://localhost:5001/config.js"></script>
```

Then use it in your JavaScript:
```javascript
// Check if config is loaded
if (window.CONFIG) {
  const API_BASE_URL = window.CONFIG.API_BASE_URL;
  console.log('Using backend:', API_BASE_URL);
} else {
  console.error('Backend config not loaded!');
}

// Example API call
fetch(`${window.CONFIG.API_BASE_URL}/auth/validate-token`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Environment-Specific Configuration
The backend automatically detects the environment:
- **Development:** `NODE_ENV !== 'production'` → `http://localhost:5001`
- **Production:** `NODE_ENV === 'production'` → `https://chartai-backend-697f80778bd2.herokuapp.com`

## 🐛 Troubleshooting

### Frontend Still Calling Heroku URL
1. **Check Environment Variables:**
   ```bash
   echo $NODE_ENV
   echo $PORT
   ```

2. **Verify Backend Config:**
   ```bash
   curl http://localhost:5001/api/config
   ```

3. **Test Config Script:**
   ```bash
   curl http://localhost:5001/config.js
   ```

### CORS Issues
The backend is configured to allow all origins in development mode:
- **Development:** All origins allowed
- **Production:** Only specific origins allowed

### Port Conflicts
If port 5001 is already in use:
```bash
# Find what's using the port
lsof -ti :5001

# Kill the process
kill -9 <PID>

# Or use a different port
export PORT=5002
```

## 🔗 Available Endpoints

### API Endpoints
- `GET /api/config` - Backend configuration
- `GET /api/auth/validate-token` - Token validation
- `GET /api/uml/health` - UML service health
- `GET /health` - Server health check
- `GET /memory` - Memory usage stats

### Static Files
- `GET /config.js` - Dynamic JavaScript config
- `GET /public/*` - Static files from public directory

## 📝 Environment Variables

### Required for Local Development
```bash
NODE_ENV=development
PORT=5001
```

### Optional (for full functionality)
```bash
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_SECRET_KEY=your_anthropic_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
JWT_SECRET=your_jwt_secret
```

## 🚀 Testing the Setup

1. **Start the backend:**
   ```bash
   npm run dev
   ```

2. **Test the config endpoint:**
   ```bash
   curl http://localhost:5001/api/config
   ```

3. **Test the JavaScript config:**
   ```bash
   curl http://localhost:5001/config.js
   ```

4. **Verify CORS:**
   ```bash
   curl -H "Origin: http://localhost:3000" http://localhost:5001/api/config
   ```

## 📚 Next Steps

1. Update your frontend to use the dynamic config
2. Replace hardcoded Heroku URLs with `window.CONFIG.API_BASE_URL`
3. Test all API endpoints with the local backend
4. Deploy changes to production when ready

---

**Need help?** Check the server logs for detailed CORS and configuration information. 