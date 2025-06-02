import { Router } from 'express';
import * as orderController from '../controllers/orderController';

const router = Router();

router.post('/order', orderController.createOrder);
router.put('/order/:id', orderController.updateOrderStatus);

export default router;