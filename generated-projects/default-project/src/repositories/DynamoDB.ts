```typescript
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

interface CalculationRecord {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export class DynamoDBRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient({});
    this.tableName = process.env.DYNAMODB_TABLE_NAME || '';
  }

  public async saveRecord(record: CalculationRecord): Promise<void> {
    try {
      const params = {
        TableName: this.tableName,
        Item: marshall(record),
      };
      await this.client.send(new PutItemCommand(params));
    } catch (error) {
      console.error('Error saving record to DynamoDB:', error);
      throw new Error('Could not save record');
    }
  }

  public async retrieveRecord(id: string): Promise<CalculationRecord | null> {
    try {
      const params = {
        TableName: this.tableName,
        Key: marshall({ id }),
      };
      const { Item } = await this.client.send(new GetItemCommand(params));
      return Item ? (unmarshall(Item) as CalculationRecord) : null;
    } catch (error) {
      console.error('Error retrieving record from DynamoDB:', error);
      throw new Error('Could not retrieve record');
    }
  }
}
```