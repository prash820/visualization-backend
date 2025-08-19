import { Router } from 'express';
import TaskController from '../controllers/TaskController';

const router = Router();

router.get('/tasks', TaskController.getTasks);
router.post('/tasks', TaskController.createTask);
router.put('/tasks/:id', TaskController.updateTask);
router.delete('/tasks/:id', TaskController.deleteTask);

export default router;