import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';

const router = Router();

router.post('/', ProjectController.createProject);

export default router;