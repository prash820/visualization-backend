"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const magicRoutes_1 = __importDefault(require("./routes/magicRoutes"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const memoryManager_1 = require("./utils/memoryManager");
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
// Increase for testing Magic Flow POC (polling every 2-3 seconds)
const MAX_REQUESTS = process.env.NODE_ENV === 'production' ? 100 : 300; // 300 requests per minute for dev/testing
const simpleRateLimiter = (req, res, next) => {
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
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // In development mode, be more permissive
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[CORS] Allowing origin in development: ${origin}`);
            return callback(null, true);
        }
        // Define allowed origins for production
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://v0-image-analysis-gp-omega.vercel.app',
            'https://chartai-backend-697f80778bd2.herokuapp.com'
        ];
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log(`[CORS] Allowing known origin: ${origin}`);
            callback(null, true);
        }
        else {
            console.log(`[CORS] Rejecting unknown origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400 // Cache preflight for 24 hours
};
app.use((0, cors_1.default)(corsOptions));
// 🔹 Serve static files from public directory
app.use('/public', express_1.default.static(path_1.default.join(__dirname, '../public')));
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
app.use("/api/magic", magicRoutes_1.default); // 🚀 NEW: Magic one-step app creation
// 🔹 Configuration endpoint for frontend
app.get("/api/config", (req, res) => {
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
app.get("/config.js", (req, res) => {
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
app.use(errorHandler_1.errorHandler);
// Helper function to kill process using a specific port
const killProcessOnPort = (port) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        // Find process using the port
        exec(`lsof -ti :${port}`, (error, stdout) => {
            if (error) {
                // No process found on port, which is fine
                resolve();
                return;
            }
            const pid = stdout.trim();
            if (pid) {
                console.log(`[Terraform Service] Killing existing process ${pid} on port ${port}`);
                exec(`kill -9 ${pid}`, (killError) => {
                    if (killError) {
                        console.error(`[Terraform Service] Failed to kill process ${pid}:`, killError);
                    }
                    else {
                        console.log(`[Terraform Service] Successfully killed process ${pid}`);
                    }
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    });
});
// Helper function to check if port is available
const isPortAvailable = (port) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec(`lsof -ti :${port}`, (error, stdout) => {
            if (error) {
                // No process found on port, it's available
                resolve(true);
            }
            else {
                // Process found on port, it's not available
                resolve(false);
            }
        });
    });
});
let terraformProcess = null;
let server = null;
const startTerraformService = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log("🚀 Starting Terraform FastAPI service...");
    // First, kill any existing process on port 8000
    yield killProcessOnPort(8000);
    // Wait a moment for the port to be freed
    yield new Promise(resolve => setTimeout(resolve, 2000));
    // Verify port is available
    const portAvailable = yield isPortAvailable(8000);
    if (!portAvailable) {
        console.error("[Terraform Service] Port 8000 is still in use after cleanup attempt");
        return;
    }
    // Memory-optimized Terraform service startup
    terraformProcess = (0, child_process_1.spawn)("uvicorn", ["main:app", "--host", "0.0.0.0", "--port", "8000"], {
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
            // Restart after a delay
            setTimeout(() => {
                startTerraformService();
            }, 5000);
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
});
// Graceful shutdown handler
const gracefulShutdown = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    // Shutdown memory manager
    memoryManager_1.memoryManager.shutdown();
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
    }
    else {
        process.exit(0);
    }
});
// Register graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
const startServer = () => {
    console.log("🚀 Starting Chart AI Visualization Backend...");
    // Initialize memory management
    console.log("🧠 Initializing memory management...");
    memoryManager_1.memoryManager.setupMemoryMonitoring();
    memoryManager_1.memoryManager.logMemoryUsage("Startup");
    // Create server with increased timeout
    server = app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        // Log initial memory usage
        memoryManager_1.memoryManager.logMemoryUsage("Server Started");
        // Set server timeout to 5 minutes
        server.timeout = 300000;
        // Start Terraform service as a subprocess
        startTerraformService();
    });
};
startServer();
