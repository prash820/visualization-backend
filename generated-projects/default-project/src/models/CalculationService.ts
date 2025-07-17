import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface Calculation {
  id: string;
  expression: string;
  result: string;
  userId: string;
  timestamp: number;
}

export const CalculationSchema = {
  TableName: process.env.DYNAMODB_TABLE_NAME!,
  KeySchema: [
    { AttributeName: 'id', KeyType: 'HASH' },
  ],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};