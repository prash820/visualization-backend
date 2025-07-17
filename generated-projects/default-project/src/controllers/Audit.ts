import { Request, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { validateAudit } from '../models/Audit';

export const createAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const auditData = req.body;
    if (!validateAudit(auditData)) {
      res.status(400).json({ error: 'Invalid audit data' });
      return;
    }
    const audit = await AuditService.createAudit(auditData);
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const auditId = req.params.id;
    const audit = await AuditService.getAudit(auditId);
    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }
    res.status(200).json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};