```typescript
import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';

class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const user = await DynamoDB.getUserByUsername(username);
      if (!user || user.password !== password) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = await this.generateToken(user);
      res.status(200).json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const existingUser = await DynamoDB.getUserByUsername(username);
      if (existingUser) {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }

      const newUser = await DynamoDB.createUser({ username, password });
      const token = await this.generateToken(newUser);
      res.status(201).json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async generateToken(user: any): Promise<string> {
    // Implement token generation logic here
    return 'generated-token';
  }
}

export default new AuthController();
```