// Complete route code
import { Router } from 'express';
import { addTodo, editTodo, deleteTodo } from '../controllers/TodoController';

const router = Router();

router.post('/todos', addTodo);
router.put('/todos/:id', editTodo);
router.delete('/todos/:id', deleteTodo);

export default router;
