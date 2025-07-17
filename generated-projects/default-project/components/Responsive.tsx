import React, { useState, useEffect } from 'react';

interface ResponsiveProps {
  title: string;
  onSubmit: (data: any) => void;
}

const Responsive: React.FC<ResponsiveProps> = ({ title, onSubmit }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression: inputValue }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data.result);
        onSubmit(data);
      } else {
        setError(data.message || 'An error occurred');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="responsive-component">
      <h1>{title}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          aria-label="Expression Input"
          className="expression-input"
        />
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </form>
      {error && <div role="alert" className="error-message">{error}</div>}
      {result && <div className="result-output">Result: {result}</div>}
    </div>
  );
};

export default Responsive;