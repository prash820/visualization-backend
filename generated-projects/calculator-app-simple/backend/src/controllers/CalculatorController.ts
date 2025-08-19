import { Request, Response } from 'express';
import CalculatorService from '../services/CalculatorService';

class CalculatorController {
  public static calculate(req: Request, res: Response): void {
    const { expression } = req.body;
    const result = CalculatorService.evaluate(expression);
    res.json({ result });
  }
}

export default CalculatorController;