import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

export default function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    morgan('combined')(req, res, (err) => {
      if (err) {
        console.error('Logging error:', err.message || err);
      }
      next();
    });
  } catch (error: any) {
    console.error('Unexpected error in logging middleware:', error.message || error);
    next(error);
  }
}