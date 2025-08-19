import NotesRepository from '../repositories/NotesRepository';
import Note from '../models/Note';

class NotesService {
  async getAllNotes(): Promise<Note[]> {
    return NotesRepository.findAll();
  }

  async createNote(noteData: Partial<Note>): Promise<Note> {
    const note: Note = { id: Date.now().toString(), ...noteData } as Note;
    await NotesRepository.save(note);
    return note;
  }

  async deleteNote(id: string): Promise<void> {
    await NotesRepository.deleteById(id);
  }
}

export default new NotesService();