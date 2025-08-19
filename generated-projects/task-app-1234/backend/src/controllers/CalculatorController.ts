import { Request, Response } from 'express';
import CalculatorService from '../services/CalculatorService';

class CalculatorController {
  public calculate(req: Request, res: Response): void {
    const { expression } = req.body;
    try {
      const result = CalculatorService.evaluate(expression);
      res.json({ result });
    } catch (error) {
      res.status(400).json({ error: 'Invalid expression' });
    }
  }
}

export default new CalculatorController();