#!/usr/bin/env node

/**
 * Test Complete Automation Pipeline
 * Tests the entire automation pipeline from UML generation to deployment
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5001';
const API_BASE = `${BASE_URL}/api`;

// Test project ID
const testProjectId = `automation-test-${Date.now()}`;

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
  logStep('1. Health Check', 'Testing automation service health');
  
  try {
    const response = await axios.get(`${API_BASE}/automation/health`);
    
    if (response.status === 200) {
      logSuccess('Automation service health check passed');
      logInfo(`Service: ${response.data.data?.service || 'N/A'}`);
      logInfo(`Version: ${response.data.data?.version || 'N/A'}`);
      logInfo(`Active Jobs: ${response.data.data?.activeJobs || 0}`);
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

async function testStartAutomationJob() {
  logStep('2. Start Automation Job', 'Starting a complete automation pipeline');
  
  try {
    const jobData = {
      userPrompt: 'Create a task management app for remote teams with real-time collaboration, file sharing, and progress tracking',
      targetCustomers: 'Remote teams, project managers, freelancers',
      projectId: testProjectId,
      forceRegenerate: true,
      autoDeploy: false,
      generateDocumentation: true
    };

    const response = await axios.post(`${API_BASE}/automation/start`, jobData);

    if (response.status === 200 && response.data.success) {
      logSuccess('Automation job started successfully');
      
      const data = response.data.data;
      logInfo(`Job ID: ${data.jobId}`);
      logInfo(`Status: ${data.status}`);
      logInfo(`Phase: ${data.phase}`);
      logInfo(`Progress: ${data.progress}%`);
      logInfo(`Estimated Time: ${data.estimatedTime}`);
      
      return data.jobId;
    } else {
      logError('Failed to start automation job');
      return null;
    }
  } catch (error) {
    logError(`Start automation job error: ${error.message}`);
    if (error.response) {
      logError(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

async function testJobStatusPolling(jobId) {
  logStep('3. Job Status Polling', 'Monitoring job progress through phases');
  
  if (!jobId) {
    logError('No job ID provided for status polling');
    return false;
  }

  const maxAttempts = 30; // 5 minutes with 10-second intervals
  let attempts = 0;
  let lastPhase = '';
  let lastProgress = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_BASE}/automation/status/${jobId}`);
      
      if (response.status === 200 && response.data.success) {
        const job = response.data.data;
        
        // Log phase changes
        if (job.phase !== lastPhase) {
          logInfo(`Phase changed: ${lastPhase} → ${job.phase}`);
          lastPhase = job.phase;
        }
        
        // Log progress changes
        if (job.progress !== lastProgress) {
          logInfo(`Progress: ${lastProgress}% → ${job.progress}%`);
          lastProgress = job.progress;
        }
        
        // Check if job is completed
        if (job.status === 'completed') {
          logSuccess('Job completed successfully!');
          logInfo(`Final Phase: ${job.phase}`);
          logInfo(`Final Progress: ${job.progress}%`);
          
          if (job.result) {
            logInfo(`Project Path: ${job.result.projectPath || 'N/A'}`);
            logInfo(`Deployment URL: ${job.result.deploymentUrl || 'N/A'}`);
            logInfo(`Generated Files: ${job.result.appCode ? 'Yes' : 'No'}`);
            logInfo(`Documentation: ${job.result.documentation ? 'Yes' : 'No'}`);
          }
          
          return true;
        }
        
        // Check if job failed
        if (job.status === 'failed') {
          logError('Job failed');
          if (job.result?.errors) {
            job.result.errors.forEach(error => logError(`Error: ${error}`));
          }
          return false;
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        attempts++;
        
      } else {
        logError('Failed to get job status');
        return false;
      }
    } catch (error) {
      logError(`Status polling error: ${error.message}`);
      return false;
    }
  }
  
  logWarning('Job polling timed out');
  return false;
}

async function testJobLogs(jobId) {
  logStep('4. Job Logs', 'Retrieving job logs');
  
  if (!jobId) {
    logError('No job ID provided for logs');
    return false;
  }

  try {
    const response = await axios.get(`${API_BASE}/automation/logs/${jobId}`);

    if (response.status === 200 && response.data.success) {
      logSuccess('Job logs retrieved successfully');
      
      const data = response.data.data;
      logInfo(`Total Logs: ${data.totalLogs}`);
      
      // Display logs
      if (data.logs && data.logs.length > 0) {
        logInfo('Recent Logs:');
        data.logs.slice(-10).forEach(log => {
          logInfo(`  ${log}`);
        });
      }
      
      return true;
    } else {
      logError('Failed to get job logs');
      return false;
    }
  } catch (error) {
    logError(`Job logs error: ${error.message}`);
    return false;
  }
}

async function testGetAllJobs() {
  logStep('5. Get All Jobs', 'Retrieving all automation jobs');
  
  try {
    const response = await axios.get(`${API_BASE}/automation/jobs`);

    if (response.status === 200 && response.data.success) {
      logSuccess('All jobs retrieved successfully');
      
      const data = response.data.data;
      logInfo(`Total Jobs: ${data.totalJobs}`);
      
      if (data.jobs && data.jobs.length > 0) {
        logInfo('Recent Jobs:');
        data.jobs.slice(-5).forEach(job => {
          logInfo(`  ${job.jobId}: ${job.status} (${job.phase}) - ${job.progress}%`);
        });
      }
      
      return true;
    } else {
      logError('Failed to get all jobs');
      return false;
    }
  } catch (error) {
    logError(`Get all jobs error: ${error.message}`);
    return false;
  }
}

async function testProjectStructure(jobId) {
  logStep('6. Project Structure', 'Checking generated project structure');
  
  if (!jobId) {
    logError('No job ID provided for project structure check');
    return false;
  }

  try {
    const projectPath = path.join(process.cwd(), 'generated-projects', jobId);
    
    // Check if project directory exists
    try {
      await fs.access(projectPath);
      logSuccess('Project directory created');
    } catch {
      logError('Project directory not found');
      return false;
    }

    // Check for key directories and files
    const checks = [
      { path: 'frontend', type: 'directory' },
      { path: 'backend', type: 'directory' },
      { path: 'shared', type: 'directory' },
      { path: 'task-plan.json', type: 'file' },
      { path: 'frontend/package.json', type: 'file' },
      { path: 'backend/package.json', type: 'file' },
      { path: 'frontend/src', type: 'directory' },
      { path: 'backend/src', type: 'directory' }
    ];

    for (const check of checks) {
      const fullPath = path.join(projectPath, check.path);
      try {
        const stat = await fs.stat(fullPath);
        if (check.type === 'directory' && stat.isDirectory()) {
          logInfo(`✅ ${check.path} (directory)`);
        } else if (check.type === 'file' && stat.isFile()) {
          logInfo(`✅ ${check.path} (file)`);
        } else {
          logWarning(`⚠️  ${check.path} (unexpected type)`);
        }
      } catch {
        logWarning(`⚠️  ${check.path} (not found)`);
      }
    }

    // Check for documentation
    try {
      const docPath = path.join(projectPath, 'documentation.json');
      await fs.access(docPath);
      logSuccess('Documentation generated');
    } catch {
      logWarning('Documentation not found');
    }

    return true;
  } catch (error) {
    logError(`Project structure check error: ${error.message}`);
    return false;
  }
}

async function testAppCodeConversion() {
  logStep('7. App Code Conversion', 'Testing app code conversion with context');
  
  try {
    // Test with sample app code that includes UML and infrastructure context
    const sampleAppCode = {
      frontend: {
        components: {
          'TaskList.tsx': `import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignee: string;
  dueDate: Date;
}

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskUpdate }) => {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    if (filter === 'all') {
      setFilteredTasks(tasks);
    } else {
      setFilteredTasks(tasks.filter(task => task.status === filter));
    }
  }, [tasks, filter]);

  return (
    <div className="task-list">
      <div className="filters mb-4">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      
      <div className="tasks">
        {filteredTasks.map(task => (
          <div key={task.id} className="task-item border rounded p-4 mb-2">
            <h3 className="text-lg font-semibold">{task.title}</h3>
            <p className="text-gray-600">{task.description}</p>
            <div className="task-meta mt-2 text-sm text-gray-500">
              <span>Status: {task.status}</span>
              <span>Assignee: {task.assignee}</span>
              <span>Due: {task.dueDate.toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;`
        },
        pages: {
          'Dashboard.tsx': `import React from 'react';
import TaskList from '../components/TaskList';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <h1 className="text-2xl font-bold mb-6">Task Management Dashboard</h1>
      <TaskList tasks={[]} onTaskUpdate={() => {}} />
    </div>
  );
};

export default Dashboard;`
        }
      },
      backend: {
        controllers: {
          'taskController.ts': `import { Request, Response } from 'express';

export class TaskController {
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
      // Get tasks from database
      res.status(200).json({
        success: true,
        data: []
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tasks'
      });
    }
  }

  static async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, assignee, dueDate } = req.body;
      
      // Create task in database
      res.status(201).json({
        success: true,
        data: { id: 'task_1', title, description, assignee, dueDate }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to create task'
      });
    }
  }
}`
        },
        models: {
          'Task.ts': `export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignee: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  assignee: string;
  dueDate: Date;
}`
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
      logSuccess('App code conversion with context completed');
      
      const data = response.data.data;
      logInfo(`Project Path: ${data.projectPath}`);
      logInfo(`Frontend Path: ${data.frontendPath}`);
      logInfo(`Backend Path: ${data.backendPath}`);
      logInfo(`Generated Files: ${data.generatedFiles}`);
      
      return true;
    } else {
      logError('App code conversion failed');
      return false;
    }
  } catch (error) {
    logError(`App code conversion error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bright}${colors.magenta}🤖 Complete Automation Pipeline Test${colors.reset}`, 'magenta');
  log(`Testing the complete automation pipeline from UML to deployment`, 'blue');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Test Project ID: ${testProjectId}`, 'blue');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Start Automation Job', fn: testStartAutomationJob },
    { name: 'Job Status Polling', fn: () => testJobStatusPolling(testProjectId) },
    { name: 'Job Logs', fn: () => testJobLogs(testProjectId) },
    { name: 'Get All Jobs', fn: testGetAllJobs },
    { name: 'Project Structure', fn: () => testProjectStructure(testProjectId) },
    { name: 'App Code Conversion', fn: testAppCodeConversion }
  ];

  let passedTests = 0;
  let totalTests = tests.length;
  let jobId = null;

  for (const test of tests) {
    try {
      let result;
      if (test.name === 'Start Automation Job') {
        result = await test.fn();
        if (result) {
          jobId = result;
          passedTests++;
        }
      } else if (test.name === 'Job Status Polling' || test.name === 'Job Logs' || test.name === 'Project Structure') {
        result = await test.fn(jobId);
        if (result) {
          passedTests++;
        }
      } else {
        result = await test.fn();
        if (result) {
          passedTests++;
        }
      }
    } catch (error) {
      logError(`Test "${test.name}" failed with error: ${error.message}`);
    }
  }

  // Summary
  log(`\n${colors.bright}${colors.magenta}📊 Test Summary${colors.reset}`, 'magenta');
  log(`Passed: ${passedTests}/${totalTests} tests`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! Complete automation pipeline is working correctly.');
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
  testStartAutomationJob,
  testJobStatusPolling,
  testJobLogs,
  testGetAllJobs,
  testProjectStructure,
  testAppCodeConversion
}; 