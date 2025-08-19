import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthRequest } from '../types/express';

dotenv.config();

interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Enhanced authentication middleware
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  console.log('[authenticateToken] Middleware called for path:', req.path);
  console.log('[authenticateToken] Method:', req.method);
  console.log('[authenticateToken] Headers:', req.headers);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ 
      error: 'Access denied. No token provided.',
      message: 'Please log in to access this resource.'
    });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Create a user object with the required fields
    const user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Token expired.',
        message: 'Please log in again.'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ 
        error: 'Invalid token.',
        message: 'Please log in again.'
      });
    } else {
      res.status(403).json({ 
        error: 'Token verification failed.',
        message: 'Please log in again.'
      });
    }
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
    
    const user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
    req.user = user;
    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required.',
        message: 'Please log in to access this resource.'
      });
      return;
    }

    const userRole = req.user.role || 'user';
    
    if (!roles.includes(userRole)) {
      res.status(403).json({ 
        error: 'Insufficient permissions.',
        message: `This resource requires one of the following roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};

// Require specific role
export const requireUser = requireRole(['user', 'admin']);
export const requireAdmin = requireRole(['admin']);

// Rate limiting for authentication endpoints
export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // 5 attempts per window

  // Simple in-memory rate limiting for auth endpoints
  if (!req.app.locals.authAttempts) {
    req.app.locals.authAttempts = new Map();
  }

  const attempts = req.app.locals.authAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > attempts.resetTime) {
    attempts.count = 1;
    attempts.resetTime = now + windowMs;
  } else {
    attempts.count++;
  }

  req.app.locals.authAttempts.set(ip, attempts);

  if (attempts.count > maxAttempts) {
    res.status(429).json({ 
      error: 'Too many authentication attempts.',
      message: 'Please try again later.',
      retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
    });
    return;
  }

  next();
}; 