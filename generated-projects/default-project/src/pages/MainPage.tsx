import React, { useState, useEffect } from 'react';
import { Display } from '../components/Display';
import { Keypad } from '../components/Keypad';
import { History } from '../components/History';
import { CloudFront } from '../services/CloudFront';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const MainPage: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const cloudFrontService = new CloudFront();
    // Example: cloudFrontService.someMethod();
  }, []);

  const handleInputChange = (newInput: string) => {
    setInput(newInput);
  };

  const handleCalculate = async (expression: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expression }),
      });

      if (!response.ok) {
        throw new Error('Calculation failed');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error calculating:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-page" role="main" aria-label="Main Calculator Interface">
      <Display initialInput={input} initialResult={result} />
      <Keypad onInputChange={handleInputChange} onCalculate={handleCalculate} isLoading={isLoading} />
      <History />
    </div>
  );
};

export default MainPage;