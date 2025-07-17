import { Request, Response } from 'express';
import { CalculationService } from '../services/CalculationService';

export class CalculationController {
  private calculationService: CalculationService;

  constructor(calculationService: CalculationService) {
    this.calculationService = calculationService;
  }

  async createCalculation(req: Request, res: Response): Promise<void> {
    try {
      const { expression } = req.body;
      const userId = req.user.id; // Assuming user is attached to request
      const calculation = await this.calculationService.calculateAndSave(expression, userId);
      res.status(201).json(calculation);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getCalculation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const calculation = await this.calculationService.getCalculationById(id);
      if (calculation) {
        res.status(200).json(calculation);
      } else {
        res.status(404).json({ error: 'Calculation not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}