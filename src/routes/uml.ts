import { Router, Request, Response, NextFunction } from 'express';
import { 
  generateUmlDiagrams,
  saveUmlDiagram,
  getUmlDiagram,
  updateUmlDiagram,
  deleteUmlDiagram 
} from '../controllers/umlController';

const router = Router();

// Middleware to handle authentication
const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    // Verify token here
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};

// Generate UML diagrams from a prompt
router.post('/generate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await generateUmlDiagrams(req, res);
});

// Save a UML diagram
router.post('/save', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await saveUmlDiagram(req, res);
});

// Get a UML diagram
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await getUmlDiagram(req, res);
});

// Update a UML diagram
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await updateUmlDiagram(req, res);
});

// Delete a UML diagram
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  await deleteUmlDiagram(req, res);
});

export default router; 