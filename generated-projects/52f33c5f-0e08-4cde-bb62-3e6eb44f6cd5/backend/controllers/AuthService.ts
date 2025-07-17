import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyHandler } from 'aws-lambda';
import serverless from 'serverless-http';
import express from 'express';

const app = express();
app.use(express.json());

const dynamoDbClient = new DynamoDBClient({});
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'Users';

interface User {
  username: string;
  password: string;
}

interface AuthService {
  validateUser(username: string, password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  generateToken(username: string): string;
}

class AuthServiceImpl implements AuthService {
  async validateUser(username: string, password: string): Promise<boolean> {
    try {
      const params = {
        TableName: DYNAMODB_TABLE_NAME,
        Key: {
          username: { S: username }
        }
      };
      const command = new GetItemCommand(params);
      const { Item } = await dynamoDbClient.send(command);
      if (!Item || !Item.password) return false;
      const hashedPassword = Item.password.S || '';
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Error validating user:', error);
      return false;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  generateToken(username: string): string {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  }
}

const authService = new AuthServiceImpl();

app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const isValidUser = await authService.validateUser(username, password);
  if (!isValidUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = authService.generateToken(username);
  res.json({ token });
});

app.post('/api/register', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const hashedPassword = await authService.hashPassword(password);
  // Logic to save user to DynamoDB
  // ...
  res.status(201).json({ message: 'User registered successfully' });
});

exports.handler = serverless(app);