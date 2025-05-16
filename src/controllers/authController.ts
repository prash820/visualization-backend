// src/controllers/authController.ts
import { Request, Response } from "express";
import express from "express";
// import User from "../models/User"; // Removed
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createUser, validateUser } from "../utils/userFileStore";

dotenv.config();
const router = express.Router();
export default router;

// Register User
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await createUser(email, password);
    res.json({ message: "User registered", user: { _id: user._id, email: user.email } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// Login User
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await validateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
  res.json({ token, user: { _id: user._id, email: user.email } });
};

// Validate Token
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    res.status(200).json({ message: "Token is valid!", decoded });
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};
