import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

export default async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Bypass auth in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const isValid = await authService.validateToken(token);
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    next();
  } catch (error: any) {
    const errorMessage = error.message || 'Internal Server Error';
    res.status(500).json({ error: errorMessage });
  }
}