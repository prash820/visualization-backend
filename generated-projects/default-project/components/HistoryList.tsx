import React, { useState, useEffect } from 'react';
import { Calculation } from '@/types/calculation';
import { ApiService } from '@/services/api';

interface HistoryListProps {
  onSelectCalculation: (calculation: Calculation) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HistoryList: React.FC<HistoryListProps> = ({ onSelectCalculation }) => {
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalculations = async () => {
      try {
        const response = await ApiService.get(`${API_BASE_URL}/calculations`);
        setCalculations(response.data);
      } catch (err) {
        setError('Failed to load calculations');
      } finally {
        setLoading(false);
      }
    };

    fetchCalculations();
  }, []);

  if (loading) {
    return <div role="status" aria-label="Loading calculations">Loading...</div>;
  }

  if (error) {
    return <div role="alert" aria-label="Error loading calculations">{error}</div>;
  }

  return (
    <ul className="history-list" aria-label="Calculation History">
      {calculations.map((calculation) => (
        <li key={calculation.id} className="history-item">
          <button
            onClick={() => onSelectCalculation(calculation)}
            className="history-button"
            aria-label={`Select calculation ${calculation.expression}`}
          >
            {calculation.expression} = {calculation.result}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default HistoryList;