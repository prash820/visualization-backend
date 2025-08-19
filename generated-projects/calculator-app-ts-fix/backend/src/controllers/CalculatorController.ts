import { Request, Response } from 'express';
import CalculatorService from '../services/CalculatorService';

class CalculatorController {
  public async calculate(req: Request, res: Response): Promise<void> {
    const { expression } = req.body;
    const result = CalculatorService.calculate(expression);
    res.json({ result });
  }
}

export default new CalculatorController();