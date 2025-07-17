import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export interface CalculationRecord {
  id: string;
  expression: string;
  result: number;
}

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export class DynamoDBRepository {
  private tableName: string;

  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || '';
  }

  async saveRecord(record: CalculationRecord): Promise<void> {
    try {
      const params = {
        TableName: this.tableName,
        Item: marshall(record),
      };
      await dynamoDBClient.send(new PutItemCommand(params));
    } catch (error) {
      console.error('Error saving record to DynamoDB:', error);
      throw new Error('Could not save record');
    }
  }

  async retrieveRecord(id: string): Promise<CalculationRecord | null> {
    try {
      const params = {
        TableName: this.tableName,
        Key: marshall({ id }),
      };
      const result = await dynamoDBClient.send(new GetItemCommand(params));
      if (result.Item) {
        return unmarshall(result.Item) as CalculationRecord;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving record from DynamoDB:', error);
      throw new Error('Could not retrieve record');
    }
  }
}