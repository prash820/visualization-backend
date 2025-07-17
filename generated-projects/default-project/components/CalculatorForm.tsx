import React, { useState, useEffect } from 'react';

interface CalculatorFormProps {
  onSubmit: (calculationResult: string) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CalculatorForm: React.FC<CalculatorFormProps> = ({ onSubmit }) => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate');
      }

      const data = await response.json();
      setResult(data.result);
      onSubmit(data.result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Calculator Form">
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        aria-label="Calculator Input"
        className="calculator-input"
      />
      <button type="submit" className="calculator-submit">
        Calculate
      </button>
      {result && <div className="calculator-result" aria-live="polite">Result: {result}</div>}
      {error && <div className="calculator-error" role="alert">{error}</div>}
    </form>
  );
};

export default CalculatorForm;