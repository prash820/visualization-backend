import { Router } from 'express';
import { CodeGenerationController } from '../controllers/codeGenerationController';

const router = Router();
const codeGenerationController = new CodeGenerationController();

/**
 * Code Generation Engine Routes
 * 
 * This module provides REST API endpoints for the multi-agent compiler pipeline:
 * - Application generation from UML diagrams
 * - Code validation and testing
 * - Generation status and progress tracking
 * - Statistics and results retrieval
 * - File management and cleanup
 */

// Health check endpoint
router.get('/health', codeGenerationController.healthCheck.bind(codeGenerationController));

// Main application generation endpoint (with UML diagrams)
router.post('/generate', codeGenerationController.generateApplication.bind(codeGenerationController));

// AI-powered idea-to-app generation endpoint (no UML required)
router.post('/generate-from-idea', codeGenerationController.generateFromIdea.bind(codeGenerationController));

// Code validation endpoint
router.post('/validate', codeGenerationController.validateCode.bind(codeGenerationController));

// Generation status and progress
router.get('/status/:projectId', codeGenerationController.getGenerationStatus.bind(codeGenerationController));

// Generation statistics
router.get('/statistics/:projectId', codeGenerationController.getGenerationStatistics.bind(codeGenerationController));

// Detailed generation results
router.get('/results/:projectId', codeGenerationController.getGenerationResults.bind(codeGenerationController));

// Get specific generated file
router.get('/file/:projectId/:filePath(*)', codeGenerationController.getGeneratedFile.bind(codeGenerationController));

// Get task plan for a project
router.get('/task-plan/:projectId', codeGenerationController.getTaskPlan.bind(codeGenerationController));

// Clean up generated files
router.delete('/cleanup/:projectId', codeGenerationController.cleanupGeneratedFiles.bind(codeGenerationController));

export default router; 