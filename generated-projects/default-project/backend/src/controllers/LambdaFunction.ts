import { Request, Response } from 'express';
import { DynamoDBService } from '../services/DynamoDBService';
import { CalculationRecord } from '../models/DynamoDB';

export class LambdaFunctionController {
  private dynamoDBService: DynamoDBService;

  constructor() {
    this.dynamoDBService = new DynamoDBService();
  }

  public async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const { operation, operands } = req.body;

      if (!operation || !operands) {
        res.status(400).json({ error: 'Invalid request payload' });
        return;
      }

      const result = this.performCalculation(operation, operands);
      const record: CalculationRecord = { id: this.generateId(), operation, operands, result };

      await this.dynamoDBService.saveRecord(record);

      res.status(200).json({ result });
    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private performCalculation(operation: string, operands: number[]): number {
    switch (operation) {
      case 'add':
        return operands.reduce((acc, val) => acc + val, 0);
      case 'subtract':
        return operands.reduce((acc, val) => acc - val);
      case 'multiply':
        return operands.reduce((acc, val) => acc * val, 1);
      case 'divide':
        return operands.reduce((acc, val) => acc / val);
      default:
        throw new Error('Unsupported operation');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}