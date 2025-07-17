import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface Calculation {
  id: string;
  expression: string;
  result: string;
  userId: string;
  createdAt: string;
}

export class CalculationModel {
  private tableName: string;
  private dbClient: DocumentClient;

  constructor(tableName: string, dbClient: DocumentClient) {
    this.tableName = tableName;
    this.dbClient = dbClient;
  }

  async saveCalculation(calculation: Calculation): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: calculation,
    };

    await this.dbClient.put(params).promise();
  }

  async getCalculationById(id: string): Promise<Calculation | null> {
    const params = {
      TableName: this.tableName,
      Key: { id },
    };

    const result = await this.dbClient.get(params).promise();
    return result.Item as Calculation || null;
  }
}