import { Router } from 'express';
import authController from './controllers/AuthController';
import noteController from './controllers/NoteController';
import errorMiddleware from './middleware/error';

const router = Router();

router.use('/auth', authController);
router.use('/notes', noteController);

router.use(errorMiddleware);

export default router;