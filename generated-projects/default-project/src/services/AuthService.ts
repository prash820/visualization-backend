import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';
import { UserModel } from '../models/UserModel';

interface AuthService {
  registerUser(req: Request, res: Response): Promise<void>;
  loginUser(req: Request, res: Response): Promise<void>;
  validateToken(req: Request, res: Response): Promise<void>;
}

class AuthServiceImpl implements AuthService {
  private dynamoDB: DynamoDB;

  constructor(dynamoDB: DynamoDB) {
    this.dynamoDB = dynamoDB;
  }

  async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const userExists = await this.dynamoDB.getUserByUsername(username);
      if (userExists) {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      const newUser: UserModel = { username, password };
      await this.dynamoDB.saveUser(newUser);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async loginUser(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const user = await this.dynamoDB.getUserByUsername(username);
      if (!user || user.password !== password) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = this.generateToken(user);
      res.status(200).json({ token });
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization;
      if (!token) {
        res.status(401).json({ error: 'Token is required' });
        return;
      }

      const isValid = this.verifyToken(token);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      res.status(200).json({ message: 'Token is valid' });
    } catch (error) {
      console.error('Error validating token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private generateToken(user: UserModel): string {
    // Implement token generation logic
    return 'generated-token';
  }

  private verifyToken(token: string): boolean {
    // Implement token verification logic
    return true;
  }
}

export { AuthServiceImpl };