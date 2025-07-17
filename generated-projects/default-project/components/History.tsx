import React, { useState, useEffect } from 'react';
import { HistoryList } from './HistoryList';

interface HistoryProps {
  initialCalculations: Array<{
    expression: string;
    result: string;
    timestamp: string;
  }>;
}

const History: React.FC<HistoryProps> = ({ initialCalculations }) => {
  const [calculations, setCalculations] = useState(initialCalculations);

  useEffect(() => {
    // Fetch updated calculations from an API or other source if needed
    // Example: fetchCalculations();
  }, []);

  return (
    <div className="history" role="region" aria-label="Calculation History">
      <h2>Calculation History</h2>
      <HistoryList calculations={calculations} />
    </div>
  );
};

export default History;