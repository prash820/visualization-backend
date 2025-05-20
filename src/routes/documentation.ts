import express from 'express';
import {
  generateDocumentation,
  getDocumentationStatus,
  getProjectDocumentations,
  deleteDocumentationById
} from '../controllers/documentationController';
import type { Request, Response } from '../types/express.d';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Generate documentation endpoint
router.post('/generate', asyncHandler(generateDocumentation));

// Get documentation generation status
router.get('/status/:id', asyncHandler(getDocumentationStatus));

// Get all documentations for a project
router.get('/project/:projectId', asyncHandler(getProjectDocumentations));

// Delete a documentation
router.delete('/:id', asyncHandler(deleteDocumentationById));

export default router; 