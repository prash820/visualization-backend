import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';
import { AuthService } from '../services/AuthService';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const token = await AuthService.authenticateUser(username, password);
      res.status(200).json({ token });
    } catch (error) {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }

  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const userId = await AuthService.registerUser(username, password);
      res.status(201).json({ userId });
    } catch (error) {
      res.status(400).json({ error: 'Registration failed' });
    }
  }

  public static async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: 'ok' });
  }
}