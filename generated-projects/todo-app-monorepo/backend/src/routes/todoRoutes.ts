import { Router } from 'express';
import * as todoController from '../controllers/todoController';

const router = Router();

router.get('/todos', todoController.getTodos);
router.post('/todos', todoController.createTodo);
router.delete('/todos/:id', todoController.deleteTodo);

export default router;