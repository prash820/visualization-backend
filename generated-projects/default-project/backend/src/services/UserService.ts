```typescript
import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';
import { AuthService } from '../services/AuthService';

interface User {
  id: string;
  username: string;
  email: string;
  password: string;
}

export class UserService {
  private db: DynamoDB;
  private authService: AuthService;

  constructor() {
    this.db = new DynamoDB();
    this.authService = new AuthService();
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;
      const hashedPassword = await this.authService.hashPassword(password);
      const user: User = { id: this.generateId(), username, email, password: hashedPassword };

      await this.db.putItem(user);
      res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const user = await this.db.getItem(userId);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const { username, email } = req.body;
      const updatedUser: Partial<User> = { username, email };

      const result = await this.db.updateItem(userId, updatedUser);

      if (!result) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const result = await this.db.deleteItem(userId);

      if (!result) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```