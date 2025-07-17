import { Router } from 'express';
import { createAudit, getAudit } from '../controllers/Audit';

const router = Router();

router.post('/audits', createAudit);
router.get('/audits/:id', getAudit);

export default router;