import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface User {
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export class UserModel {
  private tableName: string;
  private dbClient: DocumentClient;

  constructor(dbClient: DocumentClient) {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || '';
    this.dbClient = dbClient;
  }

  async createUser(user: User): Promise<User> {
    const params = {
      TableName: this.tableName,
      Item: user,
    };

    try {
      await this.dbClient.put(params).promise();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Could not create user');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const params = {
      TableName: this.tableName,
      Key: { userId },
    };

    try {
      const result = await this.dbClient.get(params).promise();
      return result.Item as User || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Could not fetch user');
    }
  }
}