import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface Calculation {
  id: string;
  expression: string;
  result: string;
  userId: string;
  createdAt: Date;
}

export class CalculationModel {
  private tableName: string;
  private dbClient: DocumentClient;

  constructor(dbClient: DocumentClient, tableName: string) {
    this.dbClient = dbClient;
    this.tableName = tableName;
  }

  async createCalculation(calculation: Calculation): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: {
        id: calculation.id,
        expression: calculation.expression,
        result: calculation.result,
        userId: calculation.userId,
        createdAt: calculation.createdAt.toISOString(),
      },
    };

    try {
      await this.dbClient.put(params).promise();
    } catch (error) {
      console.error('Error creating calculation:', error);
      throw new Error('Could not create calculation');
    }
  }

  async getCalculationById(id: string): Promise<Calculation | null> {
    const params = {
      TableName: this.tableName,
      Key: {
        id,
      },
    };

    try {
      const result = await this.dbClient.get(params).promise();
      if (result.Item) {
        return {
          id: result.Item.id,
          expression: result.Item.expression,
          result: result.Item.result,
          userId: result.Item.userId,
          createdAt: new Date(result.Item.createdAt),
        };
      }
      return null;
    } catch (error) {
      console.error('Error retrieving calculation:', error);
      throw new Error('Could not retrieve calculation');
    }
  }
}