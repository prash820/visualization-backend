// src/controllers/localDevelopmentController.ts
import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LocalDevelopmentServer, LocalServerConfig } from '../utils/localDevelopmentServer';

interface LocalServerRequest {
  projectId: string;
  config?: Partial<LocalServerConfig>;
}

interface LocalServerResponse {
  success: boolean;
  url?: string;
  pid?: number;
  errors: string[];
  logs: string[];
  message: string;
}

// Store running local servers
const runningServers = new Map<string, { process: any; config: LocalServerConfig; url: string }>();

export class LocalDevelopmentController {
  
  /**
   * Start a local development server for a generated project
   */
  static async startLocalServer(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, config = {} }: LocalServerRequest = req.body;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      // Check if server is already running
      if (runningServers.has(projectId)) {
        const existing = runningServers.get(projectId)!;
        res.json({
          success: true,
          url: existing.url,
          pid: existing.process.pid,
          errors: [],
          logs: [`Server already running on ${existing.url}`],
          message: 'Local server is already running'
        });
        return;
      }

      // Find project directory
      const projectDir = path.join(process.cwd(), 'generated-projects', projectId, 'backend');
      
      if (!await fs.pathExists(projectDir)) {
        res.status(404).json({
          success: false,
          errors: [`Project directory not found: ${projectDir}`],
          message: 'Project not found'
        });
        return;
      }

      console.log(`[LocalDev] Starting local server for project: ${projectId}`);
      console.log(`[LocalDev] Project directory: ${projectDir}`);

      // Create local configuration
      const localConfig = await LocalDevelopmentServer.createLocalConfig(projectDir, config);
      
      // Create serverless.yml with local support if it doesn't exist
      const serverlessPath = path.join(projectDir, 'serverless.yml');
      if (!await fs.pathExists(serverlessPath)) {
        await LocalDevelopmentServer.createServerlessWithLocalSupport(projectDir, localConfig);
      }

      // Start the local server
      const result = await LocalDevelopmentServer.startLocalServer(projectDir, localConfig);
      
      if (result.success && result.process) {
        // Store running server
        runningServers.set(projectId, {
          process: result.process,
          config: localConfig,
          url: result.url
        });

        // Test server health after a short delay
        setTimeout(async () => {
          const isHealthy = await LocalDevelopmentServer.testLocalServer(result.url);
          console.log(`[LocalDev] Server health check: ${isHealthy ? '✅' : '❌'}`);
        }, 3000);

        res.json({
          success: true,
          url: result.url,
          pid: result.pid,
          errors: result.errors,
          logs: result.logs,
          message: 'Local server started successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          url: result.url,
          errors: result.errors,
          logs: result.logs,
          message: 'Failed to start local server'
        });
      }

    } catch (error: any) {
      console.error(`[LocalDev] Error starting local server:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        logs: [],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Stop a local development server
   */
  static async stopLocalServer(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      const runningServer = runningServers.get(projectId);
      
      if (!runningServer) {
        res.status(404).json({
          success: false,
          errors: [`No running server found for project: ${projectId}`],
          message: 'Server not running'
        });
        return;
      }

      console.log(`[LocalDev] Stopping local server for project: ${projectId}`);

      // Stop the server
      await LocalDevelopmentServer.stopLocalServer(runningServer.process);
      
      // Remove from running servers
      runningServers.delete(projectId);

      res.json({
        success: true,
        errors: [],
        logs: [`Server stopped for project: ${projectId}`],
        message: 'Local server stopped successfully'
      });

    } catch (error: any) {
      console.error(`[LocalDev] Error stopping local server:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        logs: [],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get status of local development servers
   */
  static async getLocalServersStatus(req: Request, res: Response): Promise<void> {
    try {
      const servers = Array.from(runningServers.entries()).map(([projectId, server]) => ({
        projectId,
        url: server.url,
        pid: server.process.pid,
        config: server.config,
        isRunning: !server.process.killed
      }));

      res.json({
        success: true,
        servers,
        totalRunning: servers.length,
        message: 'Local servers status retrieved'
      });

    } catch (error: any) {
      console.error(`[LocalDev] Error getting servers status:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Test local server health
   */
  static async testLocalServer(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      const runningServer = runningServers.get(projectId);
      
      if (!runningServer) {
        res.status(404).json({
          success: false,
          errors: [`No running server found for project: ${projectId}`],
          message: 'Server not running'
        });
        return;
      }

      const isHealthy = await LocalDevelopmentServer.testLocalServer(runningServer.url);

      res.json({
        success: true,
        isHealthy,
        url: runningServer.url,
        pid: runningServer.process.pid,
        message: isHealthy ? 'Server is healthy' : 'Server is not responding'
      });

    } catch (error: any) {
      console.error(`[LocalDev] Error testing local server:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get local development configuration for a project
   */
  static async getLocalConfig(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        res.status(400).json({
          success: false,
          errors: ['Project ID is required'],
          message: 'Missing project ID'
        });
        return;
      }

      const projectDir = path.join(process.cwd(), 'generated-projects', projectId, 'backend');
      
      if (!await fs.pathExists(projectDir)) {
        res.status(404).json({
          success: false,
          errors: [`Project directory not found: ${projectDir}`],
          message: 'Project not found'
        });
        return;
      }

      // Read local environment file
      const envPath = path.join(projectDir, '.env.local');
      let envContent = '';
      
      if (await fs.pathExists(envPath)) {
        envContent = await fs.readFile(envPath, 'utf8');
      }

      // Read package.json scripts
      const packageJsonPath = path.join(projectDir, 'package.json');
      let packageJson = null;
      
      if (await fs.pathExists(packageJsonPath)) {
        packageJson = await fs.readJson(packageJsonPath);
      }

      res.json({
        success: true,
        projectId,
        projectDir,
        envContent,
        packageJson,
        runningServer: runningServers.get(projectId) || null,
        message: 'Local configuration retrieved'
      });

    } catch (error: any) {
      console.error(`[LocalDev] Error getting local config:`, error);
      res.status(500).json({
        success: false,
        errors: [error.message],
        message: 'Internal server error'
      });
    }
  }

  /**
   * Clean up all running local servers (for shutdown)
   */
  static async cleanupAllServers(): Promise<void> {
    console.log(`[LocalDev] Cleaning up ${runningServers.size} running servers...`);
    
    for (const [projectId, server] of runningServers.entries()) {
      try {
        console.log(`[LocalDev] Stopping server for project: ${projectId}`);
        await LocalDevelopmentServer.stopLocalServer(server.process);
      } catch (error) {
        console.error(`[LocalDev] Error stopping server for project ${projectId}:`, error);
      }
    }
    
    runningServers.clear();
    console.log('[LocalDev] All servers cleaned up');
  }
} 