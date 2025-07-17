```typescript
import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';

interface CalculationRequest {
  expression: string;
  userId: string;
}

interface CalculationResponse {
  result: number | string;
  error?: string;
}

export class CalculationService {
  private dynamoDB: DynamoDB;
  private authService: AuthService;
  private userService: UserService;

  constructor() {
    this.dynamoDB = new DynamoDB();
    this.authService = new AuthService();
    this.userService = new UserService();
  }

  public async calculate(req: Request, res: Response): Promise<Response> {
    const { expression, userId }: CalculationRequest = req.body;

    try {
      if (!this.authService.isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const result = this.evaluateExpression(expression);
      await this.dynamoDB.saveCalculation(userId, expression, result);

      return res.status(200).json({ result });
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  private evaluateExpression(expression: string): number | string {
    try {
      // Simple evaluation logic for demonstration purposes
      // In a real-world scenario, consider using a library for complex calculations
      const result = eval(expression);
      return result;
    } catch (error) {
      return 'Invalid Expression';
    }
  }
}
```