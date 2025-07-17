import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';

export default async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const isValid = await AuthService.validateToken(token);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}