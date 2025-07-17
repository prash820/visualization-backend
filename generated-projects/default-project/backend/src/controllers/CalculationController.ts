import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';

interface CalculationRequest {
  expression: string;
}

interface CalculationResponse {
  result: number | string;
  error?: string;
}

export class CalculationController {
  public async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { expression }: CalculationRequest = req.body;
      if (!expression) {
        res.status(400).json({ error: 'Expression is required' });
        return;
      }

      const result = this.evaluateExpression(expression);

      await DynamoDB.saveCalculation({ expression, result });

      res.status(200).json({ result });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  private evaluateExpression(expression: string): number | string {
    try {
      // Implement a safe evaluation of the expression
      // This is a placeholder for actual implementation
      const result = eval(expression); // WARNING: eval is unsafe, replace with a proper parser
      return result;
    } catch (error) {
      return 'Invalid expression';
    }
  }
}