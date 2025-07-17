import React, { useState, useEffect } from 'react';
import { HistoryItem } from './HistoryItem';
import { CloudFront } from '../services/CloudFront';

interface HistoryListProps {}

interface CalculationHistory {
  calculation: string;
  result: string;
  timestamp: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HistoryList: React.FC<HistoryListProps> = () => {
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/calculations/history`);
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        const data: CalculationHistory[] = await response.json();
        setHistory(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div role="alert" aria-busy="true">Loading...</div>;
  }

  if (error) {
    return <div role="alert" aria-live="assertive">Error: {error}</div>;
  }

  return (
    <div className="history-list" role="list" aria-label="Calculation History List">
      {history.map((item, index) => (
        <HistoryItem
          key={index}
          calculation={item.calculation}
          result={item.result}
          timestamp={item.timestamp}
        />
      ))}
    </div>
  );
};

export default HistoryList;