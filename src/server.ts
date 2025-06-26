import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// import { connectDB } from "./db"; // Removed
import { errorHandler } from "./middleware/errorHandler";
import openAIRoutes from "./routes/openAI";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import iacRoutes from "./routes/iac";
import deployRoutes from "./routes/deployRoutes";
import umlRoutes from "./routes/uml";
import codeRoutes from "./routes/appCode";
import documentationRoutes from "./routes/documentation";
import { spawn } from "child_process";
import path from "path";

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
const MAX_REQUESTS = 100; // 100 requests per minute

const simpleRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
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
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

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
app.use("/api/uml", umlRoutes);
app.use("/api/documentation", documentationRoutes);
app.use("/api/code", codeRoutes);

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
    uptime: process.uptime()
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

const startTerraformService = () => {
  console.log("🚀 Starting Terraform FastAPI service...");

  // Memory-optimized Terraform service startup
  const terraformProcess = spawn("uvicorn", ["main:app", "--host", "0.0.0.0", "--port", "8000"], {
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

  terraformProcess.stdout?.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Terraform Service] ${output}`);
    }
  });

  terraformProcess.stderr?.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[Terraform Service Error] ${output}`);
    }
  });

  terraformProcess.on("close", (code) => {
    console.log(`[Terraform Service] Process exited with code ${code}`);
    if (code !== 0) {
      console.error("[Terraform Service] Terraform service crashed, attempting restart...");
      // Add restart logic here if needed
    }
  });

  terraformProcess.on("error", (error) => {
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

// Create server with increased timeout
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  
  // Set server timeout to 5 minutes
  server.timeout = 300000;

  // Start Terraform service as a subprocess
  startTerraformService();
});
