// Complete controller code with proper error handling
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const user = await AuthService.authenticate(req.body);
      res.status(200).json(user);
    } catch (error) {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const user = await AuthService.registerUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: 'Registration failed' });
    }
  }
}