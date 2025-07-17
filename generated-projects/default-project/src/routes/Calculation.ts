import { Router } from 'express';
import { CalculationController } from '../controllers/Calculation';
import { CalculationService } from '../services/CalculationService';

const router = Router();
const calculationService = new CalculationService();
const calculationController = new CalculationController(calculationService);

router.post('/calculations', (req, res) => calculationController.createCalculation(req, res));
router.get('/calculations/:id', (req, res) => calculationController.getCalculation(req, res));

export default router;