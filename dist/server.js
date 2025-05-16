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
const db_1 = require("./db");
const errorHandler_1 = require("./middleware/errorHandler");
const openAI_1 = __importDefault(require("./routes/openAI"));
const auth_1 = __importDefault(require("./routes/auth"));
const project_1 = __importDefault(require("./routes/project"));
const iacRoutes_1 = __importDefault(require("./routes/iacRoutes")); // ✅ New IaC Route
const deployRoutes_1 = __importDefault(require("./routes/deployRoutes"));
const uml_1 = __importDefault(require("./routes/uml"));
const documentation_1 = __importDefault(require("./routes/documentation"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
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
const allowedOrigins = [
    "https://lucky-youtiao-ce3cda.netlify.app",
    "http://localhost:3000", // Optional for local development
];
// 🔹 Security Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use(body_parser_1.default.json());
// 🔹 CORS Configuration
app.use((0, cors_1.default)({
    origin: "*",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-Version"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
// 🔹 Apply rate limiter
app.use(simpleRateLimiter);
// 🔹 Connect to Database
(0, db_1.connectDB)();
// 🔹 API Routes
app.use("/api/generate", openAI_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/projects", project_1.default);
app.use("/api/iac", iacRoutes_1.default); // ✅ New Route for IaC
app.use("/api/deploy", deployRoutes_1.default);
app.use("/api/uml", uml_1.default);
app.use("/api/documentation", documentation_1.default);
// 🔹 Global Error Handler
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
