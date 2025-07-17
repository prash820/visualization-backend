import { DynamoDB } from '../models/DynamoDB';
import { Audit } from '../models/Audit';

export class AuditService {
  static async createAudit(auditData: Audit): Promise<Audit> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Item: auditData,
    };
    await DynamoDB.put(params).promise();
    return auditData;
  }

  static async getAudit(auditId: string): Promise<Audit | null> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Key: { id: auditId },
    };
    const result = await DynamoDB.get(params).promise();
    return result.Item as Audit || null;
  }
}