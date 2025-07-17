import { LambdaFunction } from './LambdaFunction';
import { DynamoDB } from '../models/DynamoDB';

export class LambdaFunctionService {
  static async calculateAndStore(expression: string): Promise<any> {
    try {
      const result = await LambdaFunction.invoke(expression);
      await DynamoDB.storeCalculation(expression, result);
      return { result };
    } catch (error) {
      console.error('Error in calculateAndStore:', error);
      throw new Error('Calculation error');
    }
  }
}