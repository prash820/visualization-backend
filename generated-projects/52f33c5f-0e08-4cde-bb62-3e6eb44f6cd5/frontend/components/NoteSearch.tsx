import React, { useState, useEffect } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
}

interface NoteSearchProps {
  notes: Note[];
  onSearchResults: (filteredNotes: Note[]) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const NoteSearch: React.FC<NoteSearchProps> = ({ notes, onSearchResults }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm) {
      handleSearch(searchTerm);
    } else {
      setFilteredNotes(notes);
    }
  }, [searchTerm, notes]);

  const handleSearch = async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/search?query=${term}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data: Note[] = await response.json();
      filterNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = (notesToFilter: Note[]) => {
    const filtered = notesToFilter.filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNotes(filtered);
    onSearchResults(filtered);
  };

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search notes..."
        aria-label="Search notes"
      />
      {loading && <p>Loading...</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {filteredNotes.map(note => (
          <li key={note.id}>{note.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default NoteSearch;