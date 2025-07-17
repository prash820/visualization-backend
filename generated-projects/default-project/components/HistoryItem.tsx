import React from 'react';

interface HistoryItemProps {
  expression: string;
  result: string;
  timestamp: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ expression, result, timestamp }) => {
  return (
    <div className="history-item" role="listitem" aria-label="Calculation History Item">
      <div className="expression" aria-label="Expression">{expression}</div>
      <div className="result" aria-label="Result">{result}</div>
      <div className="timestamp" aria-label="Timestamp">{new Date(timestamp).toLocaleString()}</div>
    </div>
  );
};

export default HistoryItem;