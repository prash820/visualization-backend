import express, { Request, Response, NextFunction } from 'express';
import CalculatorService from '../services/CalculatorService';
import ScientificCalculatorService from '../services/ScientificCalculatorService';
import AuthService from '../services/AuthService';

const router = express.Router();

interface CalculationRequest extends Request {
  body: {
    expression: string;
  };
}

interface AuthRequest extends Request {
  body: {
    token: string;
  };
}

router.post('/calculator/calculate', async (req: CalculationRequest, res: Response, next: NextFunction) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }
    const result = await CalculatorService.performCalculation({ expression });
    res.json({ result });
  } catch (error: any) {
    next(error);
  }
});

router.post('/scientific/calculate', async (req: CalculationRequest, res: Response, next: NextFunction) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }
    const result = await ScientificCalculatorService.processData({ expression });
    res.json({ result });
  } catch (error: any) {
    next(error);
  }
});

router.post('/auth/validate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const isValid = await AuthService.validateToken(token);
    res.json({ valid: isValid });
  } catch (error: any) {
    next(error);
  }
});

export default router;