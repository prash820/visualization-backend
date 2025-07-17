import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

const loggingMiddleware = morgan('combined', {
  stream: {
    write: (message: string) => {
      console.log(message.trim());
    }
  }
});

export default function logging(req: Request, res: Response, next: NextFunction): void {
  try {
    loggingMiddleware(req, res, (err: any) => {
      if (err) {
        console.error('Logging middleware error:', err.message || err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        next();
      }
    });
  } catch (error: any) {
    console.error('Unexpected error in logging middleware:', error.message || error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}