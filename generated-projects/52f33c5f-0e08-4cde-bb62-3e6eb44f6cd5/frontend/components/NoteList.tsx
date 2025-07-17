import React, { useState, useEffect } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
}

interface NoteListProps {
  onSelectNote: (note: Note) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NoteList: React.FC<NoteListProps> = ({ onSelectNote }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notes`);
        if (!response.ok) {
          throw new Error('Failed to fetch notes');
        }
        const data: Note[] = await response.json();
        setNotes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const renderNoteItems = () => {
    return notes.map(note => (
      <li key={note.id} onClick={() => onSelectNote(note)} role="button" aria-label={`Select note ${note.title}`}>
        {note.title}
      </li>
    ));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <ul>
      {renderNoteItems()}
    </ul>
  );
};

export default NoteList;