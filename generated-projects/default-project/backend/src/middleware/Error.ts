import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  status: number;
  message: string;
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const errorResponse: ErrorResponse = {
    status: res.statusCode !== 200 ? res.statusCode : 500,
    message: err.message || 'Internal Server Error',
  };

  res.status(errorResponse.status).json(errorResponse);
};