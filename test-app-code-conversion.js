#!/usr/bin/env node

/**
 * Test App Code Conversion and Deployment
 * Tests converting app-code.json to actual folder structure and making it hostable
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api`;

// Test project ID
const testProjectId = '52f33c5f-0e08-4cde-bb62-3e6eb44f6cd5';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${colors.cyan}${colors.bright}${step}${colors.reset}`, 'cyan');
  log(description, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testHealthCheck() {
  logStep('1. Health Check', 'Testing API health and system status');
  
  try {
    const response = await axios.get(`${API_BASE}/code-generation/health`);
    
    if (response.status === 200) {
      logSuccess('Health check passed');
      logInfo(`Service: ${response.data.data?.service || 'N/A'}`);
      logInfo(`Version: ${response.data.data?.version || 'N/A'}`);
      return true;
    } else {
      logError(`Health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error.message}`);
    return false;
  }
}

async function testAppCodeConversion() {
  logStep('2. App Code Conversion', 'Testing conversion of app-code.json to folder structure');
  
  try {
    // Sample app code structure
    const sampleAppCode = {
      frontend: {
        components: {
          'Login.tsx': `import React, { useState } from 'react';

interface LoginProps {
  onSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Login logic here
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;`,
          'Dashboard.tsx': `import React, { useState, useEffect } from 'react';

interface DashboardProps {
  // Add props as needed
}

const Dashboard: React.FC<DashboardProps> = () => {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0
  });

  useEffect(() => {
    // Fetch dashboard data
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md"></div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Items
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;`
        },
        pages: {
          'HomePage.tsx': `import React from 'react';
import Dashboard from '../components/Dashboard';

const HomePage: React.FC = () => {
  return <Dashboard />;
};

export default HomePage;`
        },
        hooks: {
          'useAuth.ts': `import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Login logic
  };

  const logout = () => {
    setUser(null);
  };

  return { user, loading, login, logout };
};`
        },
        services: {
          'apiService.ts': `import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiService = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiService;`
        },
        utils: {
          'constants.ts': `// Application constants
export const APP_NAME = 'Generated App';
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  DATA: '/data',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
};`
        }
      },
      backend: {
        controllers: {
          'authController.ts': `import { Request, Response } from 'express';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      // Authentication logic here
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token: 'demo_token',
          user: {
            id: 'user_1',
            email,
            name: 'Demo User'
          }
        }
      });

    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Email, password, and name are required'
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: 'user_1',
          email,
          name
        }
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}`
        },
        models: {
          'User.ts': `export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}`
        },
        services: {
          'authService.ts': `import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../models/User';

export class AuthService {
  static async createUser(userData: CreateUserRequest): Promise<User> {
    // User creation logic
    return {
      id: 'user_1',
      email: userData.email,
      name: userData.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async authenticateUser(credentials: LoginRequest): Promise<AuthResponse> {
    // Authentication logic
    return {
      token: 'demo_token',
      user: {
        id: 'user_1',
        email: credentials.email,
        name: 'Demo User',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  }
}`
        },
        routes: {
          'authRoutes.ts': `import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

export default router;`
        },
        middleware: {
          'authMiddleware.ts': `import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  // Token validation logic here
  req.user = { id: 'user_1', email: 'demo@example.com' };
  next();
};`
        },
        utils: {
          'database.ts': `import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export const getDynamoDB = () => dynamoDb;

export const USERS_TABLE = process.env.USERS_TABLE || 'users-table';

export const createUser = async (userData: any) => {
  const params = {
    TableName: USERS_TABLE,
    Item: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  return await dynamoDb.put(params).promise();
};`
        }
      }
    };

    const response = await axios.post(`${API_BASE}/app-code/convert`, {
      projectId: `test-conversion-${Date.now()}`,
      appCode: sampleAppCode,
      options: {
        validateCode: true,
        installDependencies: false,
        createPackageJson: true
      }
    });

    if (response.status === 200 && response.data.success) {
      logSuccess('App code conversion completed');
      
      const data = response.data.data;
      logInfo(`Project Path: ${data.projectPath}`);
      logInfo(`Frontend Path: ${data.frontendPath}`);
      logInfo(`Backend Path: ${data.backendPath}`);
      logInfo(`Generated Files: ${data.generatedFiles}`);
      
      if (data.errors && data.errors.length > 0) {
        logWarning(`Errors: ${data.errors.join(', ')}`);
      }
      
      if (data.warnings && data.warnings.length > 0) {
        logWarning(`Warnings: ${data.warnings.join(', ')}`);
      }
      
      return true;
    } else {
      logError('App code conversion failed');
      return false;
    }
  } catch (error) {
    logError(`App code conversion error: ${error.message}`);
    if (error.response) {
      logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testCodeValidation() {
  logStep('3. Code Validation', 'Testing validation of generated code');
  
  try {
    const response = await axios.post(`${API_BASE}/app-code/validate`, {
      projectId: testProjectId
    });

    if (response.status === 200 && response.data.success) {
      logSuccess('Code validation completed');
      
      const data = response.data.data;
      logInfo(`Frontend Valid: ${data.frontend.valid ? '✅' : '❌'}`);
      logInfo(`Backend Valid: ${data.backend.valid ? '✅' : '❌'}`);
      logInfo(`Overall Valid: ${data.overall.valid ? '✅' : '❌'}`);
      
      if (data.frontend.errors.length > 0) {
        logWarning(`Frontend Errors: ${data.frontend.errors.join(', ')}`);
      }
      
      if (data.backend.errors.length > 0) {
        logWarning(`Backend Errors: ${data.backend.errors.join(', ')}`);
      }
      
      return true;
    } else {
      logError('Code validation failed');
      return false;
    }
  } catch (error) {
    logError(`Code validation error: ${error.message}`);
    return false;
  }
}

async function testProjectStructure() {
  logStep('4. Project Structure', 'Testing retrieval of project structure');
  
  try {
    const response = await axios.get(`${API_BASE}/app-code/structure/${testProjectId}`);

    if (response.status === 200 && response.data.success) {
      logSuccess('Project structure retrieved');
      
      const data = response.data.data;
      logInfo(`Project ID: ${data.projectId}`);
      logInfo(`Project Path: ${data.projectPath}`);
      
      // Display structure
      logInfo('Project Structure:');
      console.log(JSON.stringify(data.structure, null, 2));
      
      return true;
    } else {
      logError('Project structure retrieval failed');
      return false;
    }
  } catch (error) {
    logError(`Project structure error: ${error.message}`);
    return false;
  }
}

async function testProjectDeployment() {
  logStep('5. Project Deployment', 'Testing project deployment');
  
  try {
    const response = await axios.post(`${API_BASE}/app-code/deploy`, {
      projectId: testProjectId,
      deploymentType: 'local'
    });

    if (response.status === 200 && response.data.success) {
      logSuccess('Project deployment completed');
      
      const data = response.data.data;
      logInfo(`Deployment Type: ${data.deploymentType}`);
      logInfo(`Frontend URL: ${data.frontendUrl || 'N/A'}`);
      logInfo(`Backend URL: ${data.backendUrl || 'N/A'}`);
      
      if (data.errors && data.errors.length > 0) {
        logWarning(`Deployment Errors: ${data.errors.join(', ')}`);
      }
      
      return true;
    } else {
      logError('Project deployment failed');
      return false;
    }
  } catch (error) {
    logError(`Project deployment error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bright}${colors.magenta}🚀 App Code Conversion & Deployment Test${colors.reset}`, 'magenta');
  log(`Testing app code conversion, validation, and deployment functionality`, 'blue');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Test Project ID: ${testProjectId}`, 'blue');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'App Code Conversion', fn: testAppCodeConversion },
    { name: 'Code Validation', fn: testCodeValidation },
    { name: 'Project Structure', fn: testProjectStructure },
    { name: 'Project Deployment', fn: testProjectDeployment }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      logError(`Test "${test.name}" failed with error: ${error.message}`);
    }
  }

  // Summary
  log(`\n${colors.bright}${colors.magenta}📊 Test Summary${colors.reset}`, 'magenta');
  log(`Passed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! App code conversion and deployment is working correctly.');
  } else {
    logWarning(`⚠️  ${totalTests - passedTests} tests failed. Please check the system.`);
  }

  return passedTests === totalTests;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Test suite failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testAppCodeConversion,
  testCodeValidation,
  testProjectStructure,
  testProjectDeployment
}; 