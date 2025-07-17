import { DynamoDB } from '../models/DynamoDB';
import { LambdaFunction } from '../services/LambdaFunction';
import { Request, Response } from 'express';

interface CalculationRequest {
  operation: string;
  operands: number[];
}

interface CalculationResponse {
  result: number;
  message: string;
}

export class CalculatorService {
  private dynamoDB: DynamoDB;
  private lambdaFunction: LambdaFunction;

  constructor(dynamoDB: DynamoDB, lambdaFunction: LambdaFunction) {
    this.dynamoDB = dynamoDB;
    this.lambdaFunction = lambdaFunction;
  }

  public async performOperation(req: Request, res: Response): Promise<void> {
    try {
      const { operation, operands }: CalculationRequest = req.body;
      const result = await this.calculate(operation, operands);
      await this.logOperation(operation, operands, result);
      res.status(200).json({ result, message: 'Calculation successful' });
    } catch (error) {
      res.status(500).json({ message: 'Error performing calculation', error: error.message });
    }
  }

  private async calculate(operation: string, operands: number[]): Promise<number> {
    switch (operation) {
      case 'add':
        return operands.reduce((acc, curr) => acc + curr, 0);
      case 'subtract':
        return operands.reduce((acc, curr) => acc - curr);
      case 'multiply':
        return operands.reduce((acc, curr) => acc * curr, 1);
      case 'divide':
        if (operands.includes(0)) throw new Error('Division by zero');
        return operands.reduce((acc, curr) => acc / curr);
      default:
        throw new Error('Invalid operation');
    }
  }

  private async logOperation(operation: string, operands: number[], result: number): Promise<void> {
    const logEntry = {
      operation,
      operands,
      result,
      timestamp: new Date().toISOString()
    };
    await this.dynamoDB.saveLog(logEntry);
  }
}