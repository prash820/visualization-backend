// TaskRoutes.ts
import express from 'express';
import TaskController from '../controllers/TaskController';
import { authenticate } from '../middleware/AuthMiddleware';

const router = express.Router();

// Route to create a new task
router.post('/', authenticate, async (req, res) => {
  try {
    await TaskController.createTask(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get all tasks for a project
router.get('/', authenticate, async (req, res) => {
  try {
    await TaskController.getTasks(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to mark a task as complete
router.patch('/:taskId/complete', authenticate, async (req, res) => {
  try {
    await TaskController.completeTask(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a task
router.delete('/:taskId', authenticate, async (req, res) => {
  try {
    await TaskController.deleteTask(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
