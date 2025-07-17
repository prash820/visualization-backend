import React, { useState, useEffect } from 'react';

interface NoteDetailsProps {
  noteId: string;
  onSave: (note: Note) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NoteDetails: React.FC<NoteDetailsProps> = ({ noteId, onSave }) => {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNoteDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch note details');
        }
        const data: Note = await response.json();
        setNote(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNoteDetails();
  }, [noteId]);

  const handleSave = async () => {
    if (!note) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
      if (!response.ok) {
        throw new Error('Failed to save note');
      }
      const updatedNote: Note = await response.json();
      onSave(updatedNote);
    } catch (err) {
      setError(err.message);
    }
  };

  const renderDetails = () => {
    if (loading) return <p>Loading...</p>;
    if (error) return <p role="alert">{error}</p>;
    if (!note) return <p>No note found</p>;

    return (
      <div>
        <input
          type="text"
          value={note.title}
          onChange={(e) => setNote({ ...note, title: e.target.value })}
          aria-label="Note Title"
        />
        <textarea
          value={note.content}
          onChange={(e) => setNote({ ...note, content: e.target.value })}
          aria-label="Note Content"
        />
        <button onClick={handleSave}>Save</button>
      </div>
    );
  };

  return <div>{renderDetails()}</div>;
};

export default NoteDetails;