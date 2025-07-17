import React, { useState } from 'react';

interface NoteFormProps {
  note?: { id: string; title: string; content: string };
  onSubmit: (data: { title: string; content: string }) => void;
}

const NoteForm: React.FC<NoteFormProps> = ({ note, onSubmit }) => {
  const [title, setTitle] = useState<string>(note?.title || '');
  const [content, setContent] = useState<string>(note?.content || '');
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { title?: string; content?: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!content.trim()) newErrors.content = 'Content is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        method: note ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      onSubmit({ title, content });
    } catch (error) {
      console.error('Failed to submit note:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Note Form">
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby="title-error"
        />
        {errors.title && <span id="title-error" role="alert">{errors.title}</span>}
      </div>
      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-invalid={!!errors.content}
          aria-describedby="content-error"
        />
        {errors.content && <span id="content-error" role="alert">{errors.content}</span>}
      </div>
      <button type="submit">Save Note</button>
    </form>
  );
};

export default NoteForm;