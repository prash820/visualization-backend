```typescript
import { Request, Response } from 'express';
import { DynamoDBService } from '../services/DynamoDB';
import { CalculationRecord } from '../models/DynamoDB';

const dynamoDBService = new DynamoDBService();

export class DynamoDBController {
  public async saveRecord(req: Request, res: Response): Promise<void> {
    const record: CalculationRecord = req.body;

    try {
      await dynamoDBService.saveRecord(record);
      res.status(201).send({ message: 'Record saved successfully' });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  }

  public async retrieveRecord(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const record = await dynamoDBService.retrieveRecord(id);
      if (record) {
        res.status(200).send(record);
      } else {
        res.status(404).send({ message: 'Record not found' });
      }
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  }
}
```