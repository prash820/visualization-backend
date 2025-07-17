import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { CalculationService } from '../services/CalculationService';

export class ValidationMiddleware {
  static async validateRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate user authentication
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await AuthService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Validate user existence
      const existingUser = await UserService.getUserById(user.id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate calculation request
      const { expression } = req.body;
      if (!expression || typeof expression !== 'string') {
        return res.status(400).json({ error: 'Invalid calculation expression' });
      }

      // Validate calculation logic
      const isValidCalculation = CalculationService.validateExpression(expression);
      if (!isValidCalculation) {
        return res.status(400).json({ error: 'Invalid calculation logic' });
      }

      next();
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}