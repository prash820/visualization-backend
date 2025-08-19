import React from 'react';

interface Note {
  id: string;
  title: string;
}

interface NotesListProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

const NotesList: React.FC<NotesListProps> = ({ notes, onDelete }) => {
  return (
    <ul>
      {notes.map(note => (
        <li key={note.id}>
          {note.title}
          <button onClick={() => onDelete(note.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
};

export default NotesList;