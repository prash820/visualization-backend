import { Request, Response } from 'express';
import { CalculatorAppService } from '../services/CalculatorAppService';

export const performCalculation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { expression } = req.body;
    if (!expression) {
      res.status(400).json({ error: 'Expression is required' });
      return;
    }
    const result = await CalculatorAppService.performCalculation(expression);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error performing calculation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};