import express, { Request, Response, NextFunction } from 'express';
import CalculatorService from '../services/CalculatorService';

const router = express.Router();

interface CalculationRequest extends Request {
  body: {
    expression: string;
  };
}

interface CalculationResponse {
  result: number;
}

router.post('/calculate', async (req: CalculationRequest, res: Response, next: NextFunction) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }

    const result: CalculationResponse = await CalculatorService.performCalculation({ expression });
    res.json(result);
  } catch (error: any) {
    if (error.message) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

export default router;