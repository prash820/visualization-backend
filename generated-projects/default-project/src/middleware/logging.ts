```typescript
import { Request, Response, NextFunction } from 'express';
import { Audit } from '../models/Audit';
import { DynamoDB } from '../models/DynamoDB';
import { v4 as uuidv4 } from 'uuid';

export const loggingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  const logRequest = async () => {
    const auditRecord: Audit = {
      requestId,
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
    };
    try {
      const dynamoDB = new DynamoDB();
      await dynamoDB.putItem(process.env.DYNAMODB_TABLE_NAME!, auditRecord);
    } catch (error) {
      console.error('Error logging request:', error);
    }
  };

  const logResponse = async () => {
    const duration = Date.now() - startTime;
    const auditRecord: Audit = {
      requestId,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      duration,
      timestamp: new Date().toISOString(),
    };
    try {
      const dynamoDB = new DynamoDB();
      await dynamoDB.putItem(process.env.DYNAMODB_TABLE_NAME!, auditRecord);
    } catch (error) {
      console.error('Error logging response:', error);
    }
  };

  res.on('finish', logResponse);
  await logRequest();
  next();
};
```