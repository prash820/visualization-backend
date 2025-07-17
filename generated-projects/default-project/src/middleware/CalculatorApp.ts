import { Request, Response, NextFunction } from 'express';

export const validateExpression = (req: Request, res: Response, next: NextFunction): void => {
  const { expression } = req.body;
  if (!expression) {
    res.status(400).json({ error: 'Expression is required' });
    return;
  }
  next();
};