import { Router } from 'express';
import NotesController from '../controllers/NotesController';

const router = Router();

router.get('/notes', NotesController.getNotes);
router.post('/notes', NotesController.createNote);
router.delete('/notes/:id', NotesController.deleteNote);

export default router;