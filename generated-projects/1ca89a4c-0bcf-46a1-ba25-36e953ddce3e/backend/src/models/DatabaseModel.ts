import { DynamoDBClient, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

interface Calculation {
  expression: string;
  result: number;
}

export class DatabaseModel {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'Calculations';
  }

  async saveCalculation(expression: string, result: number): Promise<void> {
    try {
      const params = {
        TableName: this.tableName,
        Item: {
          expression: { S: expression },
          result: { N: result.toString() }
        }
      };
      await this.client.send(new PutItemCommand(params));
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Error saving calculation: ${error.message}`);
      }
      throw new Error('Unknown error saving calculation');
    }
  }

  async getCalculationHistory(): Promise<Calculation[]> {
    try {
      const params = {
        TableName: this.tableName
      };
      const data = await this.client.send(new ScanCommand(params));
      return (data.Items || []).map(item => ({
        expression: item.expression.S || '',
        result: parseFloat(item.result.N || '0')
      }));
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Error retrieving calculation history: ${error.message}`);
      }
      throw new Error('Unknown error retrieving calculation history');
    }
  }
}