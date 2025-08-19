import express, { Request, Response, NextFunction } from 'express';
import { CalculatorController } from '../controllers/CalculatorController';
import { AuthController } from '../controllers/AuthController';

const router = express.Router();
const calculatorController = new CalculatorController();
const authController = new AuthController();

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

router.post('/api/calculator/calculate', async (req: CalculationRequest, res: Response, next: NextFunction) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }
    const result = await calculatorController.calculate(req, res, next);
    res.json({ result });
  } catch (error: any) {
    if (error.message) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

router.post('/api/auth/validate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const isValid = await authController.validateToken(req, res, next);
    res.json({ valid: isValid });
  } catch (error: any) {
    if (error.message) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

export default router;