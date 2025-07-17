```typescript
import { Router } from 'express';
import { DynamoDBController } from '../controllers/DynamoDB';

const router = Router();
const dynamoDBController = new DynamoDBController();

router.post('/records', dynamoDBController.saveRecord);
router.get('/records/:id', dynamoDBController.retrieveRecord);

export default router;
```