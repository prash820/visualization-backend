import { Request, Response } from 'express';
import { performCalculation } from '@/services/calculationService';
import { CalculationRequest, CalculationResponse } from '@/types/calculation';
import { Logger } from '@/utils/logger';

export class CalculatorController {
  public async performCalculation(req: Request, res: Response): Promise<void> {
    try {
      const calculationRequest: CalculationRequest = req.body;
      const result: CalculationResponse = await performCalculation(calculationRequest);
      res.status(200).json(result);
    } catch (error) {
      Logger.error('Error performing calculation', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}