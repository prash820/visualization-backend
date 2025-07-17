import { Request, Response } from 'express';
import { CalculationService } from '../services/CalculationService';
import { AuthService } from '../services/AuthService';

const calculationService = new CalculationService();

export const performCalculation = async (req: Request, res: Response) => {
  try {
    const userId = AuthService.getUserIdFromRequest(req);
    const { expression } = req.body;
    const calculation = await calculationService.performCalculation(expression, userId);
    res.status(200).json(calculation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform calculation' });
  }
};

export const getCalculationHistory = async (req: Request, res: Response) => {
  try {
    const userId = AuthService.getUserIdFromRequest(req);
    const history = await calculationService.getCalculationHistory(userId);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve calculation history' });
  }
};