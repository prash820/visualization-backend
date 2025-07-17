import { Calculation } from './Calculation';
import { User } from './User';

export interface Audit {
  id: string;
  userId: string;
  calculationId: string;
  timestamp: Date;
  action: string;
  details: string;
}

export function validateAudit(audit: Audit): boolean {
  if (!audit.id || !audit.userId || !audit.calculationId || !audit.timestamp || !audit.action) {
    return false;
  }
  return true;
}