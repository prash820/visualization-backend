import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const token = await AuthService.login(email, password);
    res.json({ token });
  }
}