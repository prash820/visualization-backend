import express from 'express';
import {
  generateDocumentation,
  getDocumentationStatus,
  getProjectDocumentationHandler,
  deleteProjectDocumentationHandler
} from '../controllers/documentationController';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

// Generate documentation endpoint
router.post('/generate', asyncHandler(generateDocumentation));

// Get documentation generation status
router.get('/status/:id', asyncHandler(getDocumentationStatus));

// Get documentation for a project
router.get('/project/:projectId', asyncHandler(getProjectDocumentationHandler));

// Delete a documentation (by projectId in query)
router.delete('/', asyncHandler(deleteProjectDocumentationHandler));

export default router; 