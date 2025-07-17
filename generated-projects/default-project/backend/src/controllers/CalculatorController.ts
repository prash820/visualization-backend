import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';
import { LambdaFunction } from '../services/LambdaFunction';
import { CalculatorApp } from '../services/CalculatorApp';

class CalculatorController {
  private dynamoDB: DynamoDB;
  private lambdaFunction: LambdaFunction;
  private calculatorApp: CalculatorApp;

  constructor() {
    this.dynamoDB = new DynamoDB();
    this.lambdaFunction = new LambdaFunction();
    this.calculatorApp = new CalculatorApp();
  }

  public async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { expression } = req.body;
      if (!expression) {
        res.status(400).json({ error: 'Expression is required' });
        return;
      }

      const result = await this.calculatorApp.evaluateExpression(expression);
      res.status(200).json({ result });
    } catch (error) {
      console.error('Error calculating expression:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async saveCalculation(req: Request, res: Response): Promise<void> {
    try {
      const { expression, result } = req.body;
      if (!expression || result === undefined) {
        res.status(400).json({ error: 'Expression and result are required' });
        return;
      }

      await this.dynamoDB.saveCalculation({ expression, result });
      res.status(201).json({ message: 'Calculation saved successfully' });
    } catch (error) {
      console.error('Error saving calculation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async getCalculations(req: Request, res: Response): Promise<void> {
    try {
      const calculations = await this.dynamoDB.getCalculations();
      res.status(200).json({ calculations });
    } catch (error) {
      console.error('Error retrieving calculations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export { CalculatorController };