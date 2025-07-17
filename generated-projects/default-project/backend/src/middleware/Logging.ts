import { Request, Response, NextFunction } from 'express';
import { DynamoDB } from '../models/DynamoDB';
import { AWSService } from '../services/AWSService';

interface LogEntry {
  method: string;
  url: string;
  status: number;
  responseTime: number;
  timestamp: string;
}

export const loggingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', async () => {
    const duration = Date.now() - start;
    const logEntry: LogEntry = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: duration,
      timestamp: new Date().toISOString(),
    };
    try {
      await logRequest(logEntry);
    } catch (error) {
      console.error('Error logging request:', error);
    }
  });
  next();
};

const logRequest = async (logEntry: LogEntry) => {
  const dynamoDB = new DynamoDB();
  const awsService = new AWSService(dynamoDB);
  await awsService.logToDynamoDB(logEntry);
};