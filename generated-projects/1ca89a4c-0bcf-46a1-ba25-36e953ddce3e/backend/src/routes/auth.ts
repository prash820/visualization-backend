import express, { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService';

const router = express.Router();

interface AuthRequest extends Request {
  body: {
    token: string;
  };
}

router.post('/validate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const isValid = await AuthService.validateToken(token);
    if (isValid) {
      res.status(200).json({ message: 'Token is valid' });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    if (error.message) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;