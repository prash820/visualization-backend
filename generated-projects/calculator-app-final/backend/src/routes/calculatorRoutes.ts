import { Router } from 'express';
import { calculate } from '../controllers/calculatorController';

const router = Router();

router.post('/calculate', calculate);

export default router;