import React, { useState, useEffect } from 'react';
import { HistoryList } from './HistoryList';

interface HistoryProps {
  apiUrl: string;
}

const History: React.FC<HistoryProps> = ({ apiUrl }) => {
  const [historyVisible, setHistoryVisible] = useState<boolean>(false);

  const toggleHistoryVisibility = () => {
    setHistoryVisible(!historyVisible);
  };

  return (
    <div className="history-component">
      <button onClick={toggleHistoryVisibility} aria-expanded={historyVisible}>
        {historyVisible ? 'Hide History' : 'Show History'}
      </button>
      {historyVisible && <HistoryList apiUrl={apiUrl} />}
    </div>
  );
};

export default History;