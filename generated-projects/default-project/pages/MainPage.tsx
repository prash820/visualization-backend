import React, { useState, useEffect } from 'react';
import { Display } from '../components/Display';
import { Keypad } from '../components/Keypad';
import { History } from '../components/History';

interface Calculation {
  expression: string;
  result: string;
  timestamp: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MainPage: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [history, setHistory] = useState<Calculation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (newInput: string) => {
    setInput(newInput);
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression: input }),
      });
      const data = await response.json();
      setResult(data.result);
      setHistory(prevHistory => [
        ...prevHistory,
        { expression: input, result: data.result, timestamp: new Date().toISOString() },
      ]);
    } catch (error) {
      console.error('Error calculating:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial history from API or local storage if needed
    // Example: fetchInitialHistory();
  }, []);

  return (
    <div className="main-page" role="main" aria-label="Main Calculator Page">
      <Display initialInput={input} initialResult={result} />
      <Keypad onInputChange={handleInputChange} onCalculate={handleCalculate} isLoading={isLoading} />
      <History initialCalculations={history} />
    </div>
  );
};

export default MainPage;