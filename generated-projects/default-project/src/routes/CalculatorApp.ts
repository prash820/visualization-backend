import express from 'express';
import { performCalculation } from '../controllers/CalculatorApp';

const router = express.Router();

router.post('/calculate', performCalculation);

export default router;