"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const helmet_1 = __importDefault(require("helmet"));
// import { connectDB } from "./db"; // Removed
const errorHandler_1 = require("./middleware/errorHandler");
const openAI_1 = __importDefault(require("./routes/openAI"));
const auth_1 = __importDefault(require("./routes/auth"));
const project_1 = __importDefault(require("./routes/project"));
const iac_1 = __importDefault(require("./routes/iac"));
const deployRoutes_1 = __importDefault(require("./routes/deployRoutes"));
const uml_1 = __importDefault(require("./routes/uml"));
const appCode_1 = __importDefault(require("./routes/appCode"));
const documentation_1 = __importDefault(require("./routes/documentation"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Memory optimization: Set Node.js memory limits
if (process.env.NODE_ENV === 'production') {
    // Optimize garbage collection for production
    process.env.NODE_OPTIONS = '--max-old-space-size=512 --optimize-for-size';
}
// Increase timeout for all routes
app.use((req, res, next) => {
    // Set timeout to 5 minutes (300000ms)
    req.setTimeout(300000);
    res.setTimeout(300000);
    next();
});
// Simple in-memory rate limiter
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute
const simpleRateLimiter = (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }
    else {
        const userData = requestCounts.get(ip);
        if (now > userData.resetTime) {
            // Reset if window has passed
            requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        }
        else if (userData.count >= MAX_REQUESTS) {
            // Rate limit exceeded
            res.status(429).json({
                error: "Too many requests",
                message: "Please try again later",
                retryAfter: Math.ceil((userData.resetTime - now) / 1000)
            });
            return;
        }
        else {
            // Increment count
            userData.count++;
        }
    }
    next();
};
// 🔹 Security Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use(body_parser_1.default.json({ limit: '10mb', strict: true }));
app.use(body_parser_1.default.urlencoded({ limit: '10mb', extended: true }));
// 🔹 CORS Configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400 // Cache preflight for 24 hours
};
app.use((0, cors_1.default)(corsOptions));
// 🔹 Apply rate limiter
app.use(simpleRateLimiter);
// 🔹 Connect to Database
// connectDB(); // Removed
// 🔹 API Routes
app.use("/api/generate", openAI_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/projects", project_1.default);
app.use("/api/iac", iac_1.default); // ✅ New Route for IaC
app.use("/api/deploy", deployRoutes_1.default);
app.use("/api/uml", uml_1.default);
app.use("/api/documentation", documentation_1.default);
app.use("/api/code", appCode_1.default);
// 🔹 Health Check Endpoint
app.get("/health", (req, res) => {
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
app.use(errorHandler_1.errorHandler);
const startTerraformService = () => {
    var _a, _b;
    console.log("🚀 Starting Terraform FastAPI service...");
    // Memory-optimized Terraform service startup
    const terraformProcess = (0, child_process_1.spawn)("uvicorn", ["main:app", "--host", "0.0.0.0", "--port", "8000"], {
        cwd: path_1.default.join(__dirname, "..", "terraform-runner"),
        env: Object.assign(Object.assign({}, process.env), { PYTHONUNBUFFERED: "1", PYTHONDONTWRITEBYTECODE: "1", PYTHONOPTIMIZE: "1", PATH: "/app/bin:" + process.env.PATH, TERRAFORM_PORT: "8000" }),
        stdio: ["pipe", "pipe", "pipe"]
    });
    (_a = terraformProcess.stdout) === null || _a === void 0 ? void 0 : _a.on("data", (data) => {
        const output = data.toString().trim();
        if (output) {
            console.log(`[Terraform Service] ${output}`);
        }
    });
    (_b = terraformProcess.stderr) === null || _b === void 0 ? void 0 : _b.on("data", (data) => {
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
