```typescript
import { DynamoDB } from '../models/DynamoDB';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { CalculationService } from '../services/CalculationService';
import { Request, Response } from 'express';

interface IAWSService {
  performCalculation(userId: string, expression: string): Promise<number>;
  saveCalculation(userId: string, expression: string, result: number): Promise<void>;
}

export class AWSService implements IAWSService {
  private dynamoDB: DynamoDB;
  private authService: AuthService;
  private userService: UserService;
  private calculationService: CalculationService;

  constructor() {
    this.dynamoDB = new DynamoDB();
    this.authService = new AuthService();
    this.userService = new UserService();
    this.calculationService = new CalculationService();
  }

  public async performCalculation(userId: string, expression: string): Promise<number> {
    try {
      const isAuthenticated = await this.authService.verifyUser(userId);
      if (!isAuthenticated) {
        throw new Error('User is not authenticated');
      }

      const result = await this.calculationService.calculate(expression);
      return result;
    } catch (error) {
      console.error('Error performing calculation:', error);
      throw error;
    }
  }

  public async saveCalculation(userId: string, expression: string, result: number): Promise<void> {
    try {
      const userExists = await this.userService.checkUserExists(userId);
      if (!userExists) {
        throw new Error('User does not exist');
      }

      await this.dynamoDB.saveCalculation(userId, expression, result);
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw error;
    }
  }
}
```