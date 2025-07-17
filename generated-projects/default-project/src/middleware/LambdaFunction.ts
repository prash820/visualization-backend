import { Request, Response, NextFunction } from 'express';

export function validateExpression(req: Request, res: Response, next: NextFunction) {
  const { expression } = req.body;
  if (!expression || typeof expression !== 'string') {
    return res.status(400).json({ error: 'Invalid expression' });
  }
  next();
}