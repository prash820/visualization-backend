import express from 'express';
import { getNearestRegion, getAllRegions, getRegionByValue } from '../controllers/regionController';

const router = express.Router();

// Get nearest region based on coordinates (must come before /:value)
router.get('/nearest', getNearestRegion);

// Get all available regions (must come before /:value)
router.get('/all', getAllRegions);

// Get specific region by value (must come last)
router.get('/:value', getRegionByValue);

export default router; 