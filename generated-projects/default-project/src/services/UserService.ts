import { DynamoDB } from '../models/DynamoDB';
import { AuthService } from '../services/AuthService';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export class UserService {
  private dynamoDB: DynamoDB;
  private authService: AuthService;

  constructor(dynamoDB: DynamoDB, authService: AuthService) {
    this.dynamoDB = dynamoDB;
    this.authService = authService;
  }

  public async createUser(username: string, email: string, password: string): Promise<User> {
    const userId = this.authService.generateUserId();
    const hashedPassword = await this.authService.hashPassword(password);
    const newUser: User = {
      id: userId,
      username,
      email,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.dynamoDB.put({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Item: {
          ...newUser,
          password: hashedPassword,
        },
      });
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Could not create user');
    }
  }

  public async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.dynamoDB.get({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Key: { id: userId },
      });
      return result.Item as User | null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Could not fetch user');
    }
  }

  public async deleteUser(userId: string): Promise<void> {
    try {
      await this.dynamoDB.delete({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Key: { id: userId },
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Could not delete user');
    }
  }
}