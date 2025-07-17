
const express = require('express');
const serverless = require('serverless-http');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/user', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Export for Lambda
exports.handler = serverless(app);
