// ProjectRoutes.ts
import express from 'express';
import ProjectController from '../controllers/ProjectController';
import { authenticate } from '../middleware/AuthMiddleware';

const router = express.Router();

// Route to create a new project
router.post('/', authenticate, async (req, res) => {
  try {
    await ProjectController.createProject(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get all projects for a user
router.get('/', authenticate, async (req, res) => {
  try {
    await ProjectController.getProjects(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update a project
router.put('/:projectId', authenticate, async (req, res) => {
  try {
    await ProjectController.updateProject(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a project
router.delete('/:projectId', authenticate, async (req, res) => {
  try {
    await ProjectController.deleteProject(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
