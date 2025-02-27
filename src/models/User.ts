import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

// Interface for User
export interface IUser extends Document {
  email: string;
  password: string;
  createdAt?: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

// Define Schema
const userSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Pre-save Hook for Hashing Password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
  next();
});

// Compare Password Method
userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
