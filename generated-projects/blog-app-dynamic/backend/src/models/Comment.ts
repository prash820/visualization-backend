import { Schema, model, Document } from 'mongoose';

export interface Comment extends Document {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CommentSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export default model<Comment>('Comment', CommentSchema);