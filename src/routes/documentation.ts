import express from 'express';
import { generateDocumentation } from '../controllers/documentationController';
import type { Request, Response } from '../types/express.d';

const router = express.Router();

router.post('/generate', async (req: Request, res: Response) => {
  await generateDocumentation(req, res);
});

export default router; 