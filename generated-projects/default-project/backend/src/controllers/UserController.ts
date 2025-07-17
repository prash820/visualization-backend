import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';

interface User {
  id: string;
  name: string;
  email: string;
}

export class UserController {
  private db: DynamoDB;

  constructor() {
    this.db = new DynamoDB();
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId: string = req.params.id;
      const user: User | null = await this.db.getUserById(userId);
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
    }
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { id, name, email }: User = req.body;
      const newUser: User = await this.db.createUser({ id, name, email });
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
    }
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId: string = req.params.id;
      const { name, email }: Partial<User> = req.body;
      const updatedUser: User | null = await this.db.updateUser(userId, { name, email });
      if (updatedUser) {
        res.status(200).json(updatedUser);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
    }
  }

  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId: string = req.params.id;
      const success: boolean = await this.db.deleteUser(userId);
      if (success) {
        res.status(200).json({ message: 'User deleted successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal server error', error });
    }
  }
}