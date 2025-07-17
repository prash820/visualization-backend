import { Router } from 'express';
import { performCalculation, getCalculationHistory } from '../controllers/CalculationService';

const router = Router();

router.post('/calculate', performCalculation);
router.get('/history', getCalculationHistory);

export default router;