import React, { useState, useEffect } from 'react';

interface NoteItemProps {
  id: string;
  content: string;
  onUpdate: (id: string, newContent: string) => void;
  onDelete: (id: string) => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ id, content, onUpdate, onDelete }) => {
  const [noteContent, setNoteContent] = useState<string>(content);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setNoteContent(content);
  }, [content]);

  const renderContent = () => {
    if (isEditing) {
      return (
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          aria-label="Edit note content"
        />
      );
    }
    return <p>{noteContent}</p>;
  };

  const handleNoteActions = async (action: 'update' | 'delete') => {
    setLoading(true);
    setError(null);
    try {
      if (action === 'update') {
        await fetch(`${API_BASE_URL}/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: noteContent })
        });
        onUpdate(id, noteContent);
        setIsEditing(false);
      } else if (action === 'delete') {
        await fetch(`${API_BASE_URL}/api/notes/${id}`, {
          method: 'DELETE'
        });
        onDelete(id);
      }
    } catch (err) {
      setError('An error occurred while processing your request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="note-item" role="article">
      {renderContent()}
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions">
        {isEditing ? (
          <button onClick={() => handleNoteActions('update')} disabled={loading} aria-label="Save note">
            Save
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} aria-label="Edit note">
            Edit
          </button>
        )}
        <button onClick={() => handleNoteActions('delete')} disabled={loading} aria-label="Delete note">
          Delete
        </button>
      </div>
    </div>
  );
};

export default NoteItem;