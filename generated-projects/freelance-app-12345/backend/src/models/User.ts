import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  userId: String,
  name: String,
  email: String,
  passwordHash: String,
  role: String,
});

export const User = model('User', userSchema);