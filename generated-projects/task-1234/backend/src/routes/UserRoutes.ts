// UserRoutes.ts
import express from 'express';
import UserController from '../controllers/UserController';
import AuthMiddleware from '../middleware/AuthMiddleware';
import ValidationMiddleware from '../middleware/ValidationMiddleware';

const router = express.Router();

// Route for user registration
router.post('/register', ValidationMiddleware, async (req, res) => {
  try {
    await UserController.register(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route for user login
router.post('/login', ValidationMiddleware, async (req, res) => {
  try {
    await UserController.login(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get current user details
router.get('/me', AuthMiddleware, async (req, res) => {
  try {
    await UserController.getCurrentUser(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route for user logout
router.post('/logout', AuthMiddleware, async (req, res) => {
  try {
    await UserController.logout(req, res);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
