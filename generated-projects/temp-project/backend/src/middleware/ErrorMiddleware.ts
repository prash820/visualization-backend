// ErrorMiddleware.ts
import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  status: number;
  message: string;
  stack?: string;
}

const ErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const status = err instanceof SyntaxError ? 400 : 500;
  const response: ErrorResponse = {
    status,
    message: err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

export default ErrorMiddleware;