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
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = __importDefault(require("./db"));
const errorHandler_1 = require("./middleware/errorHandler");
const openAI_1 = __importDefault(require("./routes/openAI"));
const auth_1 = __importDefault(require("./routes/auth"));
const project_1 = __importDefault(require("./routes/project"));
const iacRoutes_1 = __importDefault(require("./routes/iacRoutes")); // ✅ New IaC Route
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
const allowedOrigins = [
    "https://lucky-youtiao-ce3cda.netlify.app",
    "http://localhost:3000", // Optional for local development
];
// 🔹 Security Middleware
app.use((0, helmet_1.default)()); // Security headers
app.use(body_parser_1.default.json());
// 🔹 Rate Limiting
const limiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
// 🔹 CORS Configuration
app.use((0, cors_1.default)({
    origin: "*",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
// 🔹 Connect to Database
(0, db_1.default)();
// 🔹 API Routes
app.use("/api/generate", openAI_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/projects", project_1.default);
app.use("/api/iac", iacRoutes_1.default); // ✅ New Route for IaC
// 🔹 Global Error Handler
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
