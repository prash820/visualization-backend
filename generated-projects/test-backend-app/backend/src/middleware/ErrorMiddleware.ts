// ErrorMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from './types';
import { handleAppError } from './utils';

export class ErrorMiddleware {
  public static handleErrors = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
    handleAppError(err);
    const statusCode = err.code === 1001 ? 404 : 500; // Example: 404 for NOT_FOUND, 500 for others
    res.status(statusCode).json({ error: err.message, code: err.code });
  };
}

// Usage example
// app.use(ErrorMiddleware.handleErrors);