import React, { useState, useEffect } from 'react';
import { HistoryList } from './HistoryList';
import { CloudFront } from '../services/CloudFront';

interface HistoryProps {}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const History: React.FC<HistoryProps> = () => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/calculations/history`);
        if (!response.ok) {
          throw new Error('Failed to fetch calculation history');
        }
        const data = await response.json();
        setHistoryData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryData();
  }, []);

  if (loading) {
    return <div role="alert" aria-busy="true">Loading history...</div>;
  }

  if (error) {
    return <div role="alert" aria-live="assertive">Error: {error}</div>;
  }

  return (
    <div className="history" role="region" aria-label="Calculation History">
      <h2>Calculation History</h2>
      <HistoryList />
    </div>
  );
};

export default History;