import { DynamoDBRepository } from '../models/DynamoDB';
import { v4 as uuidv4 } from 'uuid';

export class LambdaFunctionService {
  private static dynamoDBRepository = new DynamoDBRepository();

  public static async calculateAndStore(expression: string): Promise<{ id: string; result: string }> {
    try {
      const result = eval(expression); // Note: eval is used for simplicity; consider a safer alternative in production
      const record = {
        id: uuidv4(),
        expression,
        result: result.toString(),
        timestamp: new Date().toISOString(),
      };
      await this.dynamoDBRepository.saveRecord(record);
      return { id: record.id, result: record.result };
    } catch (error) {
      console.error('Error in calculation or storing:', error);
      throw new Error('Calculation failed');
    }
  }
}