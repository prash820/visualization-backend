import React, { useState, useEffect } from 'react';
import { Display } from '../components/Display';
import { Keypad } from '../components/Keypad';
import { History } from '@/models/history';

interface MainPageProps {}

const MainPage: React.FC<MainPageProps> = () => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<number>(0);
  const [history, setHistory] = useState<History[]>([]);

  useEffect(() => {
    // Fetch history from the backend or AWS service
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/history`);
        const data = await response.json();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    };

    fetchHistory();
  }, []);

  const handleInputChange = (newInput: string) => {
    setInput(newInput);
  };

  const handleCalculate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      const data = await response.json();
      setResult(data.result);
      // Optionally update history
      setHistory([...history, { userId: 'currentUser', calculation: input, timestamp: new Date().toISOString() }]);
    } catch (error) {
      console.error('Error calculating result:', error);
    }
  };

  return (
    <div className="main-page" role="main">
      <Display initialInput={input} initialResult={result} />
      <Keypad onInputChange={handleInputChange} onCalculate={handleCalculate} />
      <div className="history" aria-label="Calculation History">
        {history.map((entry, index) => (
          <div key={index}>
            <p>{entry.calculation} at {entry.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainPage;