import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";
import openAIRoutes from "./routes/openAI";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import iacRoutes from "./routes/iac";
import deployRoutes from "./routes/deployRoutes";
import sandboxRoutes from "./routes/sandboxRoutes";
import umlRoutes from "./routes/uml";
import codeRoutes from "./routes/appCode";
import documentationRoutes from "./routes/documentation";
import magicRoutes from "./routes/magicRoutes";
import { spawn } from "child_process";
import path from "path";
import { memoryManager } from "./utils/memoryManager";
import { generateUmlFromPrompt } from './utils/umlGenerator';
import { getProjectById } from './utils/projectFileStore';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

// Memory optimization: Set Node.js memory limits
if (process.env.NODE_ENV === 'production') {
  // Optimize garbage collection for production
  process.env.NODE_OPTIONS = '--max-old-space-size=512 --optimize-for-size';
}

// Increase timeout for all routes
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set timeout to 5 minutes (300000ms)
  req.setTimeout(300000);
  res.setTimeout(300000);
  next();
});

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
// Increase for testing Magic Flow POC (polling every 2-3 seconds)
const MAX_REQUESTS = process.env.NODE_ENV === 'production' ? 100 : 300; // 300 requests per minute for dev/testing

const simpleRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  // Skip rate limiting for magic status endpoints in development
  if (process.env.NODE_ENV !== 'production' && 
      (req.path.includes('/api/magic/concept-status') || req.path.includes('/api/magic/build-status'))) {
    next();
    return;
  }
  
  const ip = req.ip || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const userData = requestCounts.get(ip)!;
    
    if (now > userData.resetTime) {
      // Reset if window has passed
      requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else if (userData.count >= MAX_REQUESTS) {
      // Rate limit exceeded
      res.status(429).json({
        error: "Too many requests",
        message: "Please try again later",
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
      return;
    } else {
      // Increment count
      userData.count++;
    }
  }
  
  next();
};

// 🔹 Security Middleware
app.use(helmet()); // Security headers
app.use(bodyParser.json({ limit: '10mb', strict: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// 🔹 CORS Configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development mode, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CORS] Allowing origin in development: ${origin}`);
      return callback(null, true);
    }
    
    // Define allowed origins for production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002', // Add support for frontend on port 3002
      'https://v0-image-analysis-gp-omega.vercel.app',
      'https://chartai-backend-697f80778bd2.herokuapp.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`[CORS] Allowing known origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`[CORS] Rejecting unknown origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// 🔹 Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, '../public')));

// 🔹 Apply rate limiter
app.use(simpleRateLimiter);

// 🔹 Connect to Database
// connectDB(); // Removed

// 🔹 API Routes
app.use("/api/generate", openAIRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/iac", iacRoutes); // ✅ New Route for IaC
app.use("/api/deploy", deployRoutes);
app.use("/api/sandbox", sandboxRoutes);
app.use("/api/uml", umlRoutes);
app.use("/api/documentation", documentationRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/magic", magicRoutes); // 🚀 NEW: Magic one-step app creation

// 🔹 Configuration endpoint for frontend
app.get("/api/config", (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const backendUrl = isProduction 
    ? 'https://chartai-backend-697f80778bd2.herokuapp.com'
    : 'http://localhost:5001';
  
  console.log(`[CONFIG] Serving config - Environment: ${process.env.NODE_ENV}, Backend URL: ${backendUrl}`);
  
  res.json({
    backendUrl,
    environment: process.env.NODE_ENV || 'development',
    isProduction,
    corsAllowed: true,
    timestamp: new Date().toISOString()
  });
});

// 🔹 JavaScript config endpoint for frontend
app.get("/config.js", (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const backendUrl = isProduction 
    ? 'https://chartai-backend-697f80778bd2.herokuapp.com'
    : 'http://localhost:5001';
  
  const configScript = `
window.CONFIG = {
  BACKEND_URL: '${backendUrl}',
  ENVIRONMENT: '${process.env.NODE_ENV || 'development'}',
  IS_PRODUCTION: ${isProduction},
  API_BASE_URL: '${backendUrl}/api',
  TIMESTAMP: '${new Date().toISOString()}'
};
console.log('🔧 Backend Config Loaded:', window.CONFIG);
`;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(configScript);
});

// 🔹 Health Check Endpoint
app.get("/health", (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
  };
  
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    memory: memUsageMB,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Memory monitoring endpoint
app.get("/memory", (req, res) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024 * 100) / 100} MB`
  };
  
  res.json({
    memory: memUsageMB,
    uptime: `${Math.round(process.uptime())} seconds`,
    timestamp: new Date().toISOString()
  });
});

// 🔹 Global Error Handler
app.use(errorHandler);

// Helper function to kill process using a specific port
const killProcessOnPort = async (port: number): Promise<void> => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Find process using the port
    exec(`lsof -ti :${port}`, (error: any, stdout: string) => {
      if (error) {
        // No process found on port, which is fine
        resolve();
        return;
      }
      
      const pid = stdout.trim();
      if (pid) {
        console.log(`[Terraform Service] Killing existing process ${pid} on port ${port}`);
        exec(`kill -9 ${pid}`, (killError: any) => {
          if (killError) {
            console.error(`[Terraform Service] Failed to kill process ${pid}:`, killError);
          } else {
            console.log(`[Terraform Service] Successfully killed process ${pid}`);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

// Helper function to check if port is available
const isPortAvailable = async (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    exec(`lsof -ti :${port}`, (error: any, stdout: string) => {
      if (error) {
        // No process found on port, it's available
        resolve(true);
      } else {
        // Process found on port, it's not available
        resolve(false);
      }
    });
  });
};

let terraformProcess: any = null;
let server: any = null;

const startTerraformService = async () => {
  console.log("🚀 Starting Terraform FastAPI service...");

  // First, kill any existing process on port 8000
  await killProcessOnPort(8000);
  
  // Wait a moment for the port to be freed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verify port is available
  const portAvailable = await isPortAvailable(8000);
  if (!portAvailable) {
    console.error("[Terraform Service] Port 8000 is still in use after cleanup attempt");
    return;
  }

  // Memory-optimized Terraform service startup
  terraformProcess = spawn("uvicorn", ["main:app", "--host", "0.0.0.0", "--port", "8000"], {
    cwd: path.join(__dirname, "..", "terraform-runner"),
    env: { 
      ...process.env,
      PYTHONUNBUFFERED: "1",
      PYTHONDONTWRITEBYTECODE: "1",  // Reduce memory usage
      PYTHONOPTIMIZE: "1",           // Optimize Python execution
      PATH: "/app/bin:" + process.env.PATH, // Ensure Terraform binary is in PATH
      TERRAFORM_PORT: "8000"
    },
    stdio: ["pipe", "pipe", "pipe"]
  });

  terraformProcess.stdout?.on("data", (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Terraform Service] ${output}`);
    }
  });

  terraformProcess.stderr?.on("data", (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Terraform Service Error] ${output}`);
    }
  });

  terraformProcess.on("close", (code: number | null) => {
    console.log(`[Terraform Service] Process exited with code ${code}`);
    if (code !== 0) {
      console.error("[Terraform Service] Terraform service crashed, attempting restart...");
      // Restart after a delay
      setTimeout(() => {
        startTerraformService();
      }, 5000);
    }
  });

  terraformProcess.on("error", (error: Error) => {
    console.error("[Terraform Service] Failed to start:", error);
  });

  // Memory cleanup interval
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      if (global.gc) {
        global.gc();
        console.log("[Memory] Forced garbage collection completed");
      }
    }, 300000); // Every 5 minutes
  }

  return terraformProcess;
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}, shutting down gracefully...`);
  
  // Shutdown memory manager
  memoryManager.shutdown();
  
  // Kill Terraform service if it's running
  if (terraformProcess) {
    console.log("[Terraform Service] Terminating Terraform service...");
    terraformProcess.kill('SIGTERM');
    
    // Wait for it to terminate, then force kill if needed
    setTimeout(() => {
      if (terraformProcess && !terraformProcess.killed) {
        console.log("[Terraform Service] Force killing Terraform service...");
        terraformProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  // Close the server
  if (server) {
    server.close(() => {
      console.log("[Server] Server closed");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Register graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

const startServer = () => {
  console.log("🚀 Starting Chart AI Visualization Backend...");
  
  // Initialize memory management
  console.log("🧠 Initializing memory management...");
  memoryManager.setupMemoryMonitoring();
  memoryManager.logMemoryUsage("Startup");

  // Create server with increased timeout
  server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Log initial memory usage
    memoryManager.logMemoryUsage("Server Started");

    // Set server timeout to 5 minutes
    server.timeout = 300000;

    // Start Terraform service as a subprocess
    startTerraformService();
  });
};

startServer();
