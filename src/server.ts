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
import iaCRoutes from "./routes/iacRoutes"; // ✅ New IaC Route
import deployRoutes from "./routes/deployRoutes";
import umlRoutes from "./routes/uml";
import documentationRoutes from "./routes/documentation";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

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

const allowedOrigins = [
  "https://lucky-youtiao-ce3cda.netlify.app",
  "http://localhost:3000",  // Optional for local development
];

// 🔹 Security Middleware
app.use(helmet()); // Security headers
app.use(bodyParser.json());

// 🔹 CORS Configuration
app.use(
  cors({
    origin: "*",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-Version"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// 🔹 Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
