import express from 'express';
import { calculateHandler } from '../controllers/APIGateway';

const router = express.Router();

router.post('/calculate', calculateHandler);

export default router;