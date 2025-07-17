import { Router } from 'express';
import { LambdaFunctionController } from '../controllers/LambdaFunction';

const router = Router();
const lambdaFunctionController = new LambdaFunctionController();

router.post('/calculate', (req, res) => lambdaFunctionController.handleRequest(req, res));

export default router;