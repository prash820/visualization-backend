import React, { useState, useEffect } from 'react';

interface CalculationHistoryProps {
  onAddHistoryEntry: (entry: string) => void;
  onClearHistory: () => void;
}

const CalculationHistory: React.FC<CalculationHistoryProps> = ({ onAddHistoryEntry, onClearHistory }) => {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    // Load history from local storage or API if needed
    const storedHistory = localStorage.getItem('calculationHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const addHistoryEntry = (entry: string) => {
    const updatedHistory = [...history, entry];
    setHistory(updatedHistory);
    localStorage.setItem('calculationHistory', JSON.stringify(updatedHistory));
    onAddHistoryEntry(entry);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('calculationHistory');
    onClearHistory();
  };

  return (
    <div>
      <h2>Calculation History</h2>
      <ul>
        {history.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ul>
      <button onClick={clearHistory}>Clear History</button>
    </div>
  );
};

export default CalculationHistory;