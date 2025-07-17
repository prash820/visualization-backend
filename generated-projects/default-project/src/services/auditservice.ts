import { Audit, AuditModel } from '@/models/audit';
import { User } from '@/models/user';
import { Calculation } from '@/models/calculation';
import { AWSService } from '@/services/awsservice';

export class AuditService {
  private auditModel: AuditModel;
  private awsService: AWSService;

  constructor(auditModel: AuditModel, awsService: AWSService) {
    this.auditModel = auditModel;
    this.awsService = awsService;
  }

  async logAudit(user: User, calculation: Calculation, result: string): Promise<void> {
    const audit: Audit = {
      id: this.awsService.generateUniqueId(),
      user,
      calculation,
      timestamp: new Date(),
      result,
    };

    this.auditModel.addAudit(audit);

    try {
      await this.awsService.saveAuditToDynamoDB(audit);
    } catch (error) {
      console.error('Error saving audit to DynamoDB:', error);
      throw new Error('Failed to log audit');
    }
  }

  getAuditsForUser(userId: string): Audit[] {
    return this.auditModel.getAuditsByUser(userId);
  }

  getAllAudits(): Audit[] {
    return this.auditModel.getAllAudits();
  }
}