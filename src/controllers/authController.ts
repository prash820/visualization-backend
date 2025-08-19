// src/controllers/authController.ts
import { Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { databaseService } from "../services/databaseService";

dotenv.config();
const router = express.Router();
export default router;

// Register User
export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters long" 
      });
    }

    // Check if user already exists
    const existingUser = databaseService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: "User with this email already exists" 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || email.split('@')[0],
      role: 'user',
      createdAt: new Date().toISOString()
    };

    databaseService.saveUser(user);

    // Generate token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      }, 
      process.env.JWT_SECRET || "secret", 
      { expiresIn: "7d" }
    );

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role 
      } 
    });

  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: "Failed to register user. Please try again." 
    });
  }
};

// Login User
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }

    // Find user
    const user = databaseService.getUserByEmail(email.toLowerCase().trim());
    console.log('[login] User lookup result:', user ? { id: user.id, email: user.email, hasPasswordHash: !!user.passwordHash } : 'Not found');
    
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    // Verify password
    console.log('[login] Attempting password verification for:', email);
    console.log('[login] Password hash from DB:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'null');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('[login] Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || "secret";
    console.log('[login] Using JWT_SECRET:', jwtSecret);
    console.log('[login] User data for token:', { id: user.id, email: user.email, role: user.role || 'user' });
    
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role || 'user' 
      }, 
      jwtSecret, 
      { expiresIn: "7d" }
    );

    res.json({ 
      message: "Login successful",
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name || user.email.split('@')[0],
        role: user.role || 'user' 
      } 
    });

  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: "Failed to authenticate. Please try again." 
    });
  }
};

// Validate Token
export const validateToken = async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    res.status(401).json({ 
      error: "No token provided.",
      message: "Please log in to access this resource."
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as any;
    
    // Get user from database to ensure they still exist
    const user = databaseService.getUserByEmail(decoded.email);
    if (!user) {
      res.status(401).json({ 
        error: "User not found.",
        message: "Please log in again."
      });
      return;
    }

    res.status(200).json({ 
      message: "Token is valid!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        role: user.role || 'user'
      }
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: "Token expired.",
        message: "Please log in again."
      });
    } else {
      res.status(401).json({ 
        error: "Invalid token.",
        message: "Please log in again."
      });
    }
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ 
        error: "Not authenticated.",
        message: "Please log in to access your profile."
      });
      return;
    }

    const dbUser = databaseService.getUserByEmail(user.email);
    if (!dbUser) {
      res.status(404).json({ 
        error: "User not found.",
        message: "Please log in again."
      });
      return;
    }

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || dbUser.email.split('@')[0],
        role: dbUser.role || 'user',
        createdAt: dbUser.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: "Failed to get profile." 
    });
  }
};

// Logout (client-side token removal)
export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({ 
    message: "Logged out successfully. Please remove the token from your client." 
  });
};
