```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { CalculationService } from '../services/CalculationService';
import { AuthService } from '../services/AuthService';

export const validateRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate authentication token
    const authToken = req.headers.authorization;
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    const user = await AuthService.verifyToken(authToken);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Validate user existence
    const existingUser = await UserService.getUserById(user.id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate calculation request
    if (!req.body.expression) {
      return res.status(400).json({ error: 'Calculation expression is required' });
    }

    const isValidExpression = CalculationService.validateExpression(req.body.expression);
    if (!isValidExpression) {
      return res.status(400).json({ error: 'Invalid calculation expression' });
    }

    // Pass validated user to the next middleware
    req.user = existingUser;
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```