import { DocumentClient } from 'aws-sdk/clients/dynamodb';

interface HistoryEntry {
  userId: string;
  calculation: string;
  timestamp: string;
}

export class History {
  private tableName: string;
  private dbClient: DocumentClient;

  constructor(tableName: string, dbClient: DocumentClient) {
    this.tableName = tableName;
    this.dbClient = dbClient;
  }

  async addEntry(entry: HistoryEntry): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: entry,
    };

    try {
      await this.dbClient.put(params).promise();
    } catch (error) {
      console.error('Error adding entry to history:', error);
      throw new Error('Could not add entry to history');
    }
  }

  async getHistoryByUser(userId: string): Promise<HistoryEntry[]> {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    try {
      const data = await this.dbClient.query(params).promise();
      return data.Items as HistoryEntry[];
    } catch (error) {
      console.error('Error retrieving history:', error);
      throw new Error('Could not retrieve history');
    }
  }
}