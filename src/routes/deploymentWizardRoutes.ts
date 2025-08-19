import express from 'express';
import { 
  getWizardSteps, 
  getSmartDefaults, 
  validateConfiguration, 
  generatePreview, 
  saveConfiguration 
} from '../controllers/deploymentWizardController';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Get all wizard steps
router.get('/steps', asyncHandler(getWizardSteps));

// Get smart defaults for application type
router.get('/defaults/:appType', asyncHandler(getSmartDefaults));

// Validate deployment configuration
router.post('/validate', asyncHandler(validateConfiguration));

// Generate deployment preview
router.post('/preview', asyncHandler(generatePreview));

// Save deployment configuration
router.post('/save/:projectId', asyncHandler(saveConfiguration));

export default router; 