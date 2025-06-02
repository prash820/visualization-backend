import { Router } from 'express';
import * as restaurantController from '../controllers/restaurantController';

const router = Router();

router.get('/', restaurantController.getRestaurants);

export default router;