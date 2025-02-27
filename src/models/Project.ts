import mongoose, { Schema, Document } from "mongoose";

// Interface for the Project model
export interface IProject extends Document {
  userId: mongoose.Types.ObjectId; // Reference to the user
  name: string;                   // Project name
  description?: string;           // Optional description
  lastPrompt: string;             // Stores the last entered prompt
  lastCode: string;               // Stores the last generated code
  framework: string;              // Framework used (e.g., Mermaid, Graphviz)
  diagramType: string;            // Type of diagram (e.g., Flowchart)
  createdAt: Date;                // Timestamp of creation
}

// Define the Project schema
const ProjectSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference user
  name: { type: String, required: true }, // Project name is required
  description: { type: String, default: "" }, // Optional description
  lastPrompt: { type: String, default: "" }, // Default empty prompt
  lastCode: { type: String, default: "" },   // Default empty code
  framework: {
    type: String,
    default: "Mermaid",
    enum: ["Mermaid", "Graphviz"], // Restrict to valid frameworks
  },
  diagramType: { type: String, default: "" }, // Default empty diagram type
  createdAt: { type: Date, default: Date.now }, // Auto-assign creation date
});

// Add an index for userId to optimize user-specific queries
ProjectSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IProject>("Project", ProjectSchema);
