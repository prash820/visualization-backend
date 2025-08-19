import React, { useState } from 'react';

interface NoteFormProps {
  addNote: (note: { id: string; title: string }) => void;
}

const NoteForm: React.FC<NoteFormProps> = ({ addNote }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title) {
      addNote({ id: Date.now().toString(), title });
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter note title"
      />
      <button type="submit">Add Note</button>
    </form>
  );
};

export default NoteForm;