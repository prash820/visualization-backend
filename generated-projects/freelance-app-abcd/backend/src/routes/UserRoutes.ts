// UserRoutes.ts
import express from 'express';
import UserController from '../controllers/UserController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Route for user registration
router.post('/register', async (req, res) => {
  try {
    await UserController.register(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route for user login
router.post('/login', async (req, res) => {
  try {
    await UserController.login(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get current user details
router.get('/me', authenticate, async (req, res) => {
  try {
    await UserController.getCurrentUser(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route for user logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await UserController.logout(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
