import { Router } from 'express';
import { CalculationController } from '../controllers/CalculationController';

const router = Router();

router.post('/calculate', CalculationController.calculate);

export default router;