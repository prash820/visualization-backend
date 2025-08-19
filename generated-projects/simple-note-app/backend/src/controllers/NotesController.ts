import { Request, Response } from 'express';
import NotesService from '../services/NotesService';

class NotesController {
  async getNotes(req: Request, res: Response) {
    try {
      const notes = await NotesService.getAllNotes();
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }

  async createNote(req: Request, res: Response) {
    try {
      const note = await NotesService.createNote(req.body);
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create note' });
    }
  }

  async deleteNote(req: Request, res: Response) {
    try {
      await NotesService.deleteNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete note' });
    }
  }
}

export default new NotesController();