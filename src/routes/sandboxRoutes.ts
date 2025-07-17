import { Router } from 'express';
import { createSandbox, getSandboxStatus, getSandboxHealth, redeploySandbox } from '../controllers/sandboxController';

const router = Router();

// Create new sandbox environment
router.post('/create', createSandbox);

// Get sandbox status
router.get('/status/:jobId', getSandboxStatus);

// Get sandbox health
router.get('/health', getSandboxHealth);

// Redeploy failed sandbox
router.post('/redeploy', redeploySandbox);

export default router; 