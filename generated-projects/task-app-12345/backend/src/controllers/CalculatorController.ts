import { Request, Response } from 'express';
import CalculatorService from '../services/CalculatorService';

class CalculatorController {
  public async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { expression } = req.body;
      const result = await CalculatorService.evaluate(expression);
      res.json({ result });
    } catch (error) {
      res.status(500).json({ error: 'Calculation error' });
    }
  }
}

export default new CalculatorController();