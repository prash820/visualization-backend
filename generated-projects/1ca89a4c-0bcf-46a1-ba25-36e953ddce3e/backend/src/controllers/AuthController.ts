import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public async validateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.body.token;
      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      const isValid = await this.authService.validateToken(token);
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
  }
}