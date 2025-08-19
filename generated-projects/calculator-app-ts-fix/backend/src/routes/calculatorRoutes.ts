import { Router } from 'express';
import CalculatorController from '../controllers/CalculatorController';

const router = Router();

router.post('/calculate', CalculatorController.calculate);

export default router;