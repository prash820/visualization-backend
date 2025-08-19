import express from 'express';
import { authenticateToken, requireUser } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';
import { 
  getPricingStatus, 
  refreshPricing, 
  getPricingData, 
  getAllPricingData,
  getOnDemandPricing,
  getBulkPricing,
  testDynamicPricing,
  getDynamicPricingStatus
} from '../controllers/pricingController';

const router = express.Router();

// Get pricing cache status
router.get('/status', authenticateToken, requireUser, asyncHandler(getPricingStatus));

// Force refresh pricing (admin only)
router.post('/refresh', authenticateToken, requireUser, asyncHandler(refreshPricing));

// Get specific service pricing
router.get('/service', authenticateToken, requireUser, asyncHandler(getPricingData));

// Get all pricing data for infrastructure generation
router.get('/all', authenticateToken, requireUser, asyncHandler(getAllPricingData));

// Get on-demand pricing for any service
router.post('/on-demand', authenticateToken, requireUser, asyncHandler(getOnDemandPricing));

// Get bulk pricing for multiple services
router.post('/bulk', authenticateToken, requireUser, asyncHandler(getBulkPricing));

// Dynamic pricing endpoints
router.get('/dynamic/test', authenticateToken, requireUser, asyncHandler(testDynamicPricing));
router.get('/dynamic/status', authenticateToken, requireUser, asyncHandler(getDynamicPricingStatus));

export default router; 