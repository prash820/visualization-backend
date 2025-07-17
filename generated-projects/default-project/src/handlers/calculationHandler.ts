```typescript
import express, { Request, Response } from 'express';
import { CalculationService } from '@/services/calculationservice';
import { AuthService } from '@/services/authservice';

const router = express.Router();
const calculationService = new CalculationService();
const authService = new AuthService();

router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const user = await authService.authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { expression, result } = req.body;
    const calculation = {
      id: new Date().toISOString(),
      expression,
      result,
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await calculationService.saveCalculation(calculation);
    res.status(201).json(calculation);
  } catch (error) {
    console.error('Error processing calculation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/calculate/:id', async (req: Request, res: Response) => {
  try {
    const user = await authService.authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const calculation = await calculationService.getCalculationById(req.params.id);
    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.json(calculation);
  } catch (error) {
    console.error('Error retrieving calculation:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
```