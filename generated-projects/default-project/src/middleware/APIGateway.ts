import { Request, Response, NextFunction } from 'express';

export const validateExpression = (req: Request, res: Response, next: NextFunction) => {
  const { expression } = req.body;
  if (!expression) {
    return res.status(400).json({ error: 'Expression is required' });
  }
  next();
};