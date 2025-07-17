import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/health', AuthController.healthCheck);

export default router;