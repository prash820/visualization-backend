import { Request, Response } from 'express';
import calculatorService from '../services/calculatorService';

export const calculate = (req: Request, res: Response) => {
  const { expression } = req.body;
  try {
    const result = calculatorService.evaluateExpression(expression);
    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};