import { DynamoDB } from '../models/DynamoDB';
import { Audit } from '../models/Audit';

export class AuditRepository {
  static async saveAudit(audit: Audit): Promise<void> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Item: audit,
    };
    await DynamoDB.put(params).promise();
  }

  static async findAuditById(auditId: string): Promise<Audit | null> {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      Key: { id: auditId },
    };
    const result = await DynamoDB.get(params).promise();
    return result.Item as Audit || null;
  }
}