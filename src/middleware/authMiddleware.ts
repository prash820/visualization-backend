import express from "express";
import type { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import User from "../models/User"; // Adjust path to your User model
import dotenv from "dotenv";

dotenv.config();

interface AuthRequest extends Request {
  user?: any; // Define user type properly if using TypeScript models
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, unknown>;
    
    // Handle Expired Token Case
    if (!decoded || !decoded.id) {
      res.status(403).json({ error: "Invalid token." });
      return;
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    req.user = user; // Attach user to the request
    next();
  } catch (error) {
    console.error("Token verification failed:", error);

    if (error instanceof TokenExpiredError) {
      res.status(401).json({ error: "Token expired. Please log in again." });
    } else {
      res.status(403).json({ error: "Invalid token." });
    }
  }
};
