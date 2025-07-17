import express from 'express';
import lambdaFunctionController from '../controllers/LambdaFunction';

const router = express.Router();

router.use('/lambda', lambdaFunctionController);

export default router;