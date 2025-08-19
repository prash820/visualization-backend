import { Schema, model, Document } from 'mongoose';

export interface User extends Document {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export default model<User>('User', UserSchema);