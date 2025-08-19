import { Request, Response, NextFunction } from 'express';
import { CalculatorService } from '../services/CalculatorService';
import { ScientificNotationService } from '../services/ScientificNotationService';

export class CalculatorController {
  private calculatorService: CalculatorService;
  private scientificNotationService: ScientificNotationService;

  constructor() {
    this.calculatorService = new CalculatorService();
    this.scientificNotationService = new ScientificNotationService();
  }

  public async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { expression } = req.body;
      if (typeof expression !== 'string') {
        res.status(400).json({ error: 'Invalid expression format' });
        return;
      }

      const result = await this.calculatorService.performCalculation(expression);
      res.json({ result });
    } catch (error: any) {
      if (error.message) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  }

  public async convertToScientific(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { number } = req.body;
      if (typeof number !== 'number') {
        res.status(400).json({ error: 'Invalid number format' });
        return;
      }

      const scientificNotation = this.scientificNotationService.convertToScientificNotation(number);
      res.json({ scientificNotation });
    } catch (error: any) {
      if (error.message) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'An unexpected error occurred' });
      }
    }
  }
}