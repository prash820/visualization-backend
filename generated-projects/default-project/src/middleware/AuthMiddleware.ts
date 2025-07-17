import { Request, Response, NextFunction } from 'express';

export const AuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization;
  if (token) {
    // Validate token logic
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
};