import { Request, Response } from 'express';
import { DynamoDB } from '../models/DynamoDB';

export class UserController {
  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const result = await DynamoDB.getItem({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Key: { userId: { S: userId } }
      }).promise();

      if (!result.Item) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user: result.Item });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, name, email } = req.body;
      await DynamoDB.putItem({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Item: {
          userId: { S: userId },
          name: { S: name },
          email: { S: email }
        }
      }).promise();

      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const { name, email } = req.body;

      await DynamoDB.updateItem({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Key: { userId: { S: userId } },
        UpdateExpression: 'SET #name = :name, #email = :email',
        ExpressionAttributeNames: {
          '#name': 'name',
          '#email': 'email'
        },
        ExpressionAttributeValues: {
          ':name': { S: name },
          ':email': { S: email }
        }
      }).promise();

      res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      await DynamoDB.deleteItem({
        TableName: process.env.DYNAMODB_TABLE_NAME!,
        Key: { userId: { S: userId } }
      }).promise();

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}