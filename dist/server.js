"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const db_1 = __importDefault(require("./db"));
const openAI_1 = __importDefault(require("./routes/openAI"));
const auth_1 = __importDefault(require("./routes/auth"));
const project_1 = __importDefault(require("./routes/project"));
const path_1 = __importDefault(require("path"));
const diagram_1 = __importDefault(require("./routes/diagram")); // NEW route for Diagrams
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Serve Frontend (React)
app.use(express_1.default.static(path_1.default.join(__dirname, '../../visualization-frontend/dist')));
app.get('/api/health', (req, res) => {
    res.json({ message: 'API is running' });
});
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../visualization-frontend/dist/index.html'));
});
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
(0, db_1.default)();
// Routes
app.use("/api/generate", openAI_1.default);
app.use("/api/auth", auth_1.default);
app.use("/api/projects", project_1.default);
// app.use("/api/render-graphviz", graphvizRoutes);  // Remove this
app.use("/api/render-diagrams", diagram_1.default); // Keep this for Diagrams
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
