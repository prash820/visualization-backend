import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

export class DynamoDB {
  private client: DynamoDBClient;

  constructor() {
    this.client = new DynamoDBClient({});
  }

  public async putItem(params: any): Promise<void> {
    try {
      const command = new PutItemCommand(params);
      await this.client.send(command);
    } catch (error) {
      console.error('Error putting item to DynamoDB:', error);
      throw new Error('DynamoDB error');
    }
  }
}