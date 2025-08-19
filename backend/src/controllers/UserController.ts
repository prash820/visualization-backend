import { AuthService } from '../services/AuthService';

import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { CreateUserDTO } from '../dto/CreateUserDTO';

export class UserController {
  constructor(private userService: UserService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserDTO = req.body;
      const user = await this.userService.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    // Missing import for AuthService
    const authService = new AuthService();
    const token = await authService.authenticate(req.body);
    res.json({ token });
  }
}
        