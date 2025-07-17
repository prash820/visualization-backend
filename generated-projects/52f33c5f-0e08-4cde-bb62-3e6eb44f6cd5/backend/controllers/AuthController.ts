import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const app = express();
app.use(express.json());

const dynamoDbClient = new DynamoDBClient({ region: 'us-east-1' });
const USERS_TABLE = process.env.DYNAMODB_TABLE_NAME || 'Users';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

interface User {
  email: string;
  password: string;
}

const generateToken = (email: string) => {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
};

app.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const params = {
    TableName: USERS_TABLE,
    Item: {
      email: { S: email },
      password: { S: hashedPassword }
    }
  };

  try {
    await dynamoDbClient.send(new PutItemCommand(params));
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Could not register user' });
  }
});

app.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const params = {
    TableName: USERS_TABLE,
    Key: {
      email: { S: email }
    }
  };

  try {
    const data = await dynamoDbClient.send(new GetItemCommand(params));
    if (!data.Item) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const storedPassword = data.Item.password.S;
    const isPasswordValid = await bcrypt.compare(password, storedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(email);
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Could not log in user' });
  }
});

app.post('/logout', (req: Request, res: Response) => {
  res.status(200).json({ message: 'User logged out successfully' });
});

const serverless = require('serverless-http');
exports.handler = serverless(app);