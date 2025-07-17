import { DynamoDB } from 'aws-sdk';
import { CalculationRecord } from '../models/DynamoDB';

const dynamoDb = new DynamoDB.DocumentClient();

export class DynamoDBService {
  private tableName: string;

  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'CalculationRecords';
  }

  public async saveRecord(record: CalculationRecord): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: record,
    };

    try {
      await dynamoDb.put(params).promise();
    } catch (error) {
      console.error('Error saving record to DynamoDB:', error);
      throw new Error('Could not save record');
    }
  }

  public async retrieveRecord(id: string): Promise<CalculationRecord | null> {
    const params = {
      TableName: this.tableName,
      Key: { id },
    };

    try {
      const result = await dynamoDb.get(params).promise();
      return result.Item as CalculationRecord | null;
    } catch (error) {
      console.error('Error retrieving record from DynamoDB:', error);
      throw new Error('Could not retrieve record');
    }
  }
}