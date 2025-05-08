import { express } from '../types/express';
import { 
  generateDocumentation, 
  generateHighLevelDocumentation, 
  generateLowLevelDocumentation 
} from '../controllers/documentationController';
import type { Request, Response } from '../types/express';

const router = express.Router();

// Combined documentation endpoint (for backward compatibility)
router.post('/generate', async (req: Request, res: Response) => {
  await generateDocumentation(req, res);
});

// Separate endpoints for high-level and low-level documentation
router.post('/generate-high-level', async (req: Request, res: Response) => {
  await generateHighLevelDocumentation(req, res);
});

router.post('/generate-low-level', async (req: Request, res: Response) => {
  await generateLowLevelDocumentation(req, res);
});

export default router; 