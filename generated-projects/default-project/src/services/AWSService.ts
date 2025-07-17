import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Audit } from '@/models/audit';

export class AWSService {
  private dynamoDBClient: DynamoDBClient;

  constructor() {
    this.dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });
  }

  generateUniqueId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async saveAuditToDynamoDB(audit: Audit): Promise<void> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        id: { S: audit.id },
        userId: { S: audit.user.id },
        calculationId: { S: audit.calculation.id },
        timestamp: { S: audit.timestamp.toISOString() },
        result: { S: audit.result },
      },
    };

    const command = new PutItemCommand(params);

    try {
      await this.dynamoDBClient.send(command);
    } catch (error) {
      console.error('Error saving to DynamoDB:', error);
      throw error;
    }
  }
}