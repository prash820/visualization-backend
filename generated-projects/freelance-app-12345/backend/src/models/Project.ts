import { Schema, model } from 'mongoose';

const projectSchema = new Schema({
  projectId: String,
  title: String,
  description: String,
  status: String,
});

export const Project = model('Project', projectSchema);