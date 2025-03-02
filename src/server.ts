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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet()); // Security headers
app.use(bodyParser.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  credentials: true
}));

connectDB();

app.use("/api/generate", openAIRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
