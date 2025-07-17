import { Request, Response, NextFunction } from 'express';

export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  console.log(`Audit action: ${req.method} ${req.url}`);
  next();
};