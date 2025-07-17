```typescript
import { Request, Response, NextFunction } from 'express';

export function validateCalculationRecord(req: Request, res: Response, next: NextFunction): void {
  const { id, expression, result, timestamp } = req.body;

  if (!id || !expression || !result || !timestamp) {
    res.status(400).send({ error: 'Missing required fields' });
  } else {
    next();
  }
}
```