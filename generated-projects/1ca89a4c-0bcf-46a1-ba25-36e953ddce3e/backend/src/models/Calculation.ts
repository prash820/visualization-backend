import { DynamoDB } from 'aws-sdk';

export interface CalculationData {
  expression: string;
  result: number;
}

export class CalculationModel {
  private dynamoDb: DynamoDB.DocumentClient;
  private tableName: string;

  constructor() {
    this.dynamoDb = new DynamoDB.DocumentClient();
    this.tableName = process.env.DYNAMODB_CALC_TABLE || 'DynamoDBCalc';
  }

  async saveCalculation(expression: string, result: number): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: {
        expression,
        result,
        timestamp: new Date().toISOString()
      }
    };

    try {
      await this.dynamoDb.put(params).promise();
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Error saving calculation: ${error.message}`);
      }
      throw new Error('Unknown error saving calculation');
    }
  }

  async getCalculationHistory(): Promise<CalculationData[]> {
    const params = {
      TableName: this.tableName
    };

    try {
      const data = await this.dynamoDb.scan(params).promise();
      return data.Items as CalculationData[];
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Error retrieving calculation history: ${error.message}`);
      }
      throw new Error('Unknown error retrieving calculation history');
    }
  }
}