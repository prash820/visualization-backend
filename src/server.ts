import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./db";
import { errorHandler } from "./middleware/errorHandler";
import openAIRoutes from "./routes/openAI";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import iaCRoutes from "./routes/iacRoutes"; // ✅ New IaC Route
import deployRoutes from "./routes/deployRoutes";


dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = [
  "https://lucky-youtiao-ce3cda.netlify.app",
  "http://localhost:3000",  // Optional for local development
];

// 🔹 Security Middleware
app.use(helmet()); // Security headers
app.use(bodyParser.json());

// 🔹 Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// 🔹 CORS Configuration
app.use(
  cors({
    origin: "*",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// 🔹 Connect to Database
connectDB();

// 🔹 API Routes
app.use("/api/generate", openAIRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/iac", iaCRoutes); // ✅ New Route for IaC
app.use("/api/deploy", deployRoutes);


// 🔹 Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
