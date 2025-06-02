import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
// import { connectDB } from "./db"; // Removed
import { errorHandler } from "./middleware/errorHandler";
import openAIRoutes from "./routes/openAI";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import iaCRoutes from "./routes/iac"; // Updated import path
import deployRoutes from "./routes/deployRoutes";
import umlRoutes from "./routes/uml";
import codeRoutes from "./routes/appCode";
import documentationRoutes from "./routes/documentation";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

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
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 🔹 CORS Configuration
app.use(
  
  cors({
    origin: "*",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-Version"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })
);

// 🔹 Apply rate limiter
app.use(simpleRateLimiter);

// 🔹 Connect to Database
// connectDB(); // Removed

// 🔹 API Routes
app.use("/api/generate", openAIRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/iac", iaCRoutes); // ✅ New Route for IaC
app.use("/api/deploy", deployRoutes);
app.use("/api/uml", umlRoutes);
app.use("/api/documentation", documentationRoutes);
app.use("/api/code", codeRoutes);

// 🔹 Global Error Handler
app.use(errorHandler);

// Create server with increased timeout
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Set server timeout to 5 minutes
  server.timeout = 300000;
});
