import { DynamoDB } from '../models/DynamoDB';

export class CalculatorAppRepository {
  static async saveCalculation(expression: string, result: string): Promise<void> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Item: {
        expression,
        result,
        timestamp: new Date().toISOString(),
      },
    };
    try {
      const dynamoDb = new DynamoDB();
      await dynamoDb.put(params);
    } catch (error) {
      console.error('Error saving calculation to DynamoDB:', error);
      throw new Error('Failed to save calculation');
    }
  }
}