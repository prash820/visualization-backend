import express from 'express';
import { 
  generateDocumentation, 
  generateHighLevelDocumentation, 
  generateLowLevelDocumentation 
} from '../controllers/documentationController';

const router = express.Router();

// Combined documentation endpoint (for backward compatibility)
router.post('/generate', async (req, res) => {
  await generateDocumentation(req, res);
});

// Separate endpoints for high-level and low-level documentation
router.post('/generate-high-level', async (req, res) => {
  await generateHighLevelDocumentation(req, res);
});

router.post('/generate-low-level', async (req, res) => {
  await generateLowLevelDocumentation(req, res);
});

export default router; 