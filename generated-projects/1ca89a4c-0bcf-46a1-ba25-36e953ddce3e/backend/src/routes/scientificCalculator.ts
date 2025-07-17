import express, { Request, Response, NextFunction } from 'express';
import ScientificCalculatorService from '../services/ScientificCalculatorService';

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
    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ error: 'Invalid expression' });
    }
    const result: CalculationResponse = await ScientificCalculatorService.processData({ expression });
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