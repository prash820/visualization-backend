import { Schema, model, Document } from 'mongoose';

export interface Task extends Document {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TaskSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export default model<Task>('Task', TaskSchema);