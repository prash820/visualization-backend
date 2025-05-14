// src/controllers/authController.ts
import { Request, Response } from "express";
import express from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
export default router;

// Register User
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: "Email already in use." });
      return;
    }

    const newUser = new User({ email, password });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Login User
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  console.log("email", email);

  try {
    const user = await User.findOne({ email });
    console.log("user", user);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" }
    );

    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
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
