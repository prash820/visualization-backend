import React from 'react';
import { CloudFront } from '../services/CloudFront';

interface HistoryItemProps {
  calculation: string;
  result: string;
  timestamp: string;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ calculation, result, timestamp }) => {
  return (
    <div className="history-item" role="listitem" aria-label="Calculation History Item">
      <div className="calculation" aria-label="Calculation">
        {calculation}
      </div>
      <div className="result" aria-label="Result">
        {result}
      </div>
      <div className="timestamp" aria-label="Timestamp">
        {new Date(timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default HistoryItem;