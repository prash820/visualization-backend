import React, { useState } from 'react';

interface ScientificCalculatorProps {
  onCalculate: (result: string) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({ onCalculate }) => {
  const [expression, setExpression] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpression(e.target.value);
  };

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate');
      }

      const data = await response.json();
      setResult(data.result);
      onCalculate(data.result);
    } catch (err) {
      setError('An error occurred while calculating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scientific-calculator">
      <h2>Scientific Calculator</h2>
      <input
        type="text"
        value={expression}
        onChange={handleInputChange}
        aria-label="Expression"
        className="calculator-input"
      />
      <button onClick={calculate} disabled={loading} className="calculate-button">
        {loading ? 'Calculating...' : 'Calculate'}
      </button>
      {error && <div role="alert" className="error-message">{error}</div>}
      {result && <div className="result">Result: {result}</div>}
    </div>
  );
};

export default ScientificCalculator;