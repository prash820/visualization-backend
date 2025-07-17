import { DynamoDB } from 'aws-sdk';
import { CalculationResult } from '../models/APIGateway';

const dynamoDb = new DynamoDB.DocumentClient();
const tableName = process.env.DYNAMODB_TABLE_NAME || '';

export const storeCalculation = async (expression: string, result: number): Promise<void> => {
  const params = {
    TableName: tableName,
    Item: {
      expression,
      result,
      timestamp: new Date().toISOString()
    }
  };
  try {
    await dynamoDb.put(params).promise();
  } catch (error) {
    console.error('Error storing calculation:', error);
    throw new Error('DynamoDB error');
  }
};