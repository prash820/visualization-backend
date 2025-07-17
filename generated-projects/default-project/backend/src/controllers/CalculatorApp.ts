import { Request, Response } from 'express';
import { LambdaFunction } from './LambdaFunction';
import { DynamoDB } from '../models/DynamoDB';

export class CalculatorApp {
  private lambdaFunction: LambdaFunction;
  private dynamoDB: DynamoDB;

  constructor() {
    this.lambdaFunction = new LambdaFunction();
    this.dynamoDB = new DynamoDB();
  }

  public async performCalculation(req: Request, res: Response): Promise<void> {
    try {
      const { operation, operands } = req.body;

      if (!operation || !operands) {
        res.status(400).json({ error: 'Invalid request payload' });
        return;
      }

      const result = await this.lambdaFunction.invokeCalculation(operation, operands);
      const record = { id: this.generateId(), operation, operands, result };

      await this.dynamoDB.saveRecord(record);

      res.status(200).json({ result });
    } catch (error) {
      console.error('Error performing calculation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}