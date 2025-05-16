import express from 'express';
import { generateDocumentation } from '../controllers/documentationController';
import type { Request, Response } from '../types/express.d';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Synchronous endpoint
router.post('/generate', async (req: Request, res: Response) => {
  await generateDocumentation(req, res);
});

// Asynchronous endpoint for long-running requests
router.post('/generate-async', asyncHandler(generateDocumentation));

export default router; 