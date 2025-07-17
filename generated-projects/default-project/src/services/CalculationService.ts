import { DynamoDB } from '../models/DynamoDB';
import { Calculation } from '../models/CalculationService';
import { v4 as uuidv4 } from 'uuid';

export class CalculationService {
  private db: DynamoDB.DocumentClient;

  constructor() {
    this.db = new DynamoDB.DocumentClient();
  }

  async performCalculation(expression: string, userId: string): Promise<Calculation> {
    try {
      const result = this.evaluateExpression(expression);
      const calculation: Calculation = {
        id: uuidv4(),
        expression,
        result: result.toString(),
        userId,
        timestamp: Date.now(),
      };
      await this.saveCalculation(calculation);
      return calculation;
    } catch (error) {
      throw new Error('Calculation failed');
    }
  }

  private evaluateExpression(expression: string): number {
    // Implement a basic expression evaluation logic or use a library
    return eval(expression);
  }

  private async saveCalculation(calculation: Calculation): Promise<void> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Item: calculation,
    };
    await this.db.put(params).promise();
  }

  async getCalculationHistory(userId: string): Promise<Calculation[]> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };
    const result = await this.db.query(params).promise();
    return result.Items as Calculation[];
  }
}