import express from 'express';
import { AppCodeController } from '../controllers/appCodeController';

const router = express.Router();
const appCodeController = new AppCodeController();

/**
 * Convert app-code.json to folder structure
 * POST /api/app-code/convert
 */
router.post('/convert', appCodeController.convertAppCode.bind(appCodeController));

/**
 * Validate generated code
 * POST /api/app-code/validate
 */
router.post('/validate', appCodeController.validateGeneratedCode.bind(appCodeController));

/**
 * Get project structure
 * GET /api/app-code/structure/:projectId
 */
router.get('/structure/:projectId', appCodeController.getProjectStructure.bind(appCodeController));

/**
 * Deploy project
 * POST /api/app-code/deploy
 */
router.post('/deploy', appCodeController.deployProject.bind(appCodeController));

export default router; 