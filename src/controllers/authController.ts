// src/controllers/authController.ts
import express from "express";
import type { Request, Response } from "express";
import User from "../models/User";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
export default router;

// Register User
export const registerUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "Email already in use." });
  }

  const newUser = new User({ email, password });
  await newUser.save();
  return res.status(201).json({ message: "User registered successfully!" });
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try {
      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
  
      // Compare passwords
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
  
      // Generate JWT token
      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET!, {
        expiresIn: "1h", // Token expiry time
      });
  
      res.status(200).json({ token, message: "Login successful!" });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Server error. Please try again later." });
    }
  };

// Validate Token
export const validateToken = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return res.status(200).json({ message: "Token is valid!", decoded });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token." });
  }
};
