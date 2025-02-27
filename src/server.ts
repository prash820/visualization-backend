// server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./db";
import openAIRoutes from "./routes/openAI";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/project";
import path from 'path';
import diagramsRoutes from "./routes/diagram"; // NEW route for Diagrams

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Serve Frontend (React)
app.use(express.static(path.join(__dirname, '../../visualization-frontend/dist')));

app.get('/api/health', (req : any, res : any) => {
  res.json({ message: 'API is running' });
});


app.get('*', (req : any, res : any) => {
  res.sendFile(path.join(__dirname, '../../visualization-frontend/dist/index.html'));
});

app.use(cors());
app.use(bodyParser.json());

connectDB();

// Routes
app.use("/api/generate", openAIRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
// app.use("/api/render-graphviz", graphvizRoutes);  // Remove this
app.use("/api/render-diagrams", diagramsRoutes);     // Keep this for Diagrams

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
