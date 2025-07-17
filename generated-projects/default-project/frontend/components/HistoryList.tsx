import React, { useState, useEffect } from 'react';
import { HistoryItem } from './HistoryItem';

interface HistoryListProps {
  calculations: Array<{
    expression: string;
    result: string;
    timestamp: string;
  }>;
}

const HistoryList: React.FC<HistoryListProps> = ({ calculations }) => {
  const [history, setHistory] = useState(calculations);

  useEffect(() => {
    setHistory(calculations);
  }, [calculations]);

  if (history.length === 0) {
    return <div role="alert" aria-live="polite">No calculations found.</div>;
  }

  return (
    <div className="history-list" role="list" aria-label="Calculation History List">
      {history.map((item, index) => (
        <HistoryItem
          key={index}
          expression={item.expression}
          result={item.result}
          timestamp={item.timestamp}
        />
      ))}
    </div>
  );
};

export default HistoryList;