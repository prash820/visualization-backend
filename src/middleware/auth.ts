import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthRequest } from '../types/express';
import { IUser } from '../models/User';

dotenv.config();

interface JwtPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as JwtPayload;
    // Create a minimal user object with the required fields
    const user: Partial<IUser> = {
      _id: decoded.id,
      email: decoded.email
    };
    req.user = user as IUser;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token.' });
  }
}; 