import React, { useState } from 'react';
import NotesList from './NotesList';
import NoteForm from './NoteForm';

interface Note {
  id: string;
  title: string;
}

const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  const addNote = (note: Note) => {
    setNotes([...notes, note]);
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <div>
      <h1>NoteEase</h1>
      <NoteForm addNote={addNote} />
      <NotesList notes={notes} onDelete={deleteNote} />
    </div>
  );
};

export default NotesApp;