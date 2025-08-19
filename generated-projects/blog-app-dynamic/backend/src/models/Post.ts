import { Schema, model, Document } from 'mongoose';

export interface Post extends Document {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export default model<Post>('Post', PostSchema);