import express, { Request, Response, NextFunction } from 'express';
import { CalculatorController } from '../controllers/CalculatorController';

const router = express.Router();

interface CalculateRequest extends Request {
  body: {
    expression: string;
  };
}

interface CalculateResponse extends Response {
  json: (body: { result: number }) => this;
}

router.post('/api/calculator/calculate', async (req: CalculateRequest, res: CalculateResponse, next: NextFunction) => {
  try {
    const { expression } = req.body;
    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ error: 'Invalid expression' });
    }
    const result = await CalculatorController.calculate(expression);
    res.json({ result });
  } catch (error) {
    next(error);
  }
});

export default router;