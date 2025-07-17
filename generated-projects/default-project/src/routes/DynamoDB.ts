import { Router } from 'express';
import { saveRecord, retrieveRecord } from '../controllers/DynamoDB';

const router = Router();

router.post('/record', saveRecord);
router.get('/record/:id', retrieveRecord);

export default router;