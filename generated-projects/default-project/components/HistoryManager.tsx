import React, { useState, useEffect } from 'react';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
}

interface HistoryManagerProps {
  onHistoryUpdate: (history: HistoryItem[]) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HistoryManager: React.FC<HistoryManagerProps> = ({ onHistoryUpdate }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data: HistoryItem[] = await response.json();
      setHistory(data);
      onHistoryUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addHistory = async (expression: string, result: string) => {
    const newHistoryItem: HistoryItem = {
      id: new Date().toISOString(),
      expression,
      result,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newHistoryItem),
      });
      if (!response.ok) {
        throw new Error('Failed to add history');
      }
      setHistory((prevHistory) => [...prevHistory, newHistoryItem]);
      onHistoryUpdate([...history, newHistoryItem]);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div role="alert">Error: {error}</div>;
  }

  return (
    <div>
      <h2>Calculation History</h2>
      <ul>
        {history.map((item) => (
          <li key={item.id}>
            {item.expression} = {item.result}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryManager;