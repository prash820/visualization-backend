import React, { useState, useEffect } from 'react';
import { HistoryItem } from './HistoryItem';

interface HistoryListProps {
  historyData: Array<{ entry: string; timestamp: string }>;
}

const HistoryList: React.FC<HistoryListProps> = ({ historyData }) => {
  const [history, setHistory] = useState(historyData);

  useEffect(() => {
    setHistory(historyData);
  }, [historyData]);

  return (
    <div className="history-list" role="list">
      {history.length > 0 ? (
        history.map((item, index) => (
          <HistoryItem key={index} entry={item.entry} timestamp={item.timestamp} />
        ))
      ) : (
        <p className="no-history" aria-label="no-history">No history available.</p>
      )}
    </div>
  );
};

export default HistoryList;