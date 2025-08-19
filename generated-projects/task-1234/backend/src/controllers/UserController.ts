// UserController.ts
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { handleApiError } from '../utils';

class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role } = req.body;
      const user = await this.userService.signUpUser({ email, password, name, role });
      res.status(201).json({ user });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(400).json({ error: apiError.message });
    }
  }

  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const authResponse = await this.userService.loginUser(email, password);
      res.status(200).json(authResponse);
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(401).json({ error: apiError.message });
    }
  }

  public async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId; // Assuming userId is set in request by middleware
      const user = await this.userService.getCurrentUser(userId);
      res.status(200).json({ user });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(404).json({ error: apiError.message });
    }
  }

  public async logout(req: Request, res: Response): Promise<void> {
    try {
      await this.userService.logoutUser();
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(500).json({ error: apiError.message });
    }
  }
}

export default new UserController();
