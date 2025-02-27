import express from "express";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import User from "../models/User"; // Adjust path to your User model
import dotenv from "dotenv";

dotenv.config();

interface AuthRequest extends Request {
  user?: any; // Define user type properly if using TypeScript models
}

// ✅ Instead of `jwt.JwtPayload`, define a custom type
interface DecodedToken {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.log("No token provided");
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken
    
    console.log("Decoded Token:", decoded); // ✅ Debugging

    if (!decoded || !decoded.id) {
      console.log("Invalid token structure");
      res.status(403).json({ error: "Invalid token." });
      return;
    }

    const user = await User.findById(decoded.id);
    console.log("User Found:", user); // ✅ Debugging

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    req.user = user;
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
