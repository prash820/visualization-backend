import React from 'react';

interface HistoryItemProps {
  entry: string;
  timestamp: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, timestamp }) => {
  return (
    <div className="history-item" role="listitem">
      <p className="entry">{entry}</p>
      <span className="timestamp" aria-label="timestamp">{timestamp}</span>
    </div>
  );
};

export default HistoryItem;