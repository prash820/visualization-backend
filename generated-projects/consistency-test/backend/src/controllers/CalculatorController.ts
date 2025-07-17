import { Request, Response } from 'express';
import { performCalculation } from '../services/CalculationService';

class CalculatorController {
  public async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { expression } = req.body;
      if (!expression || typeof expression !== 'string') {
        res.status(400).json({ error: 'Invalid expression' });
        return;
      }
      const result = await performCalculation(expression);
      res.status(200).json({ result });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default new CalculatorController();