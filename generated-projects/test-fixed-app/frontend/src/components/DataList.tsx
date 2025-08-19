// DataList.tsx

import React, { useEffect, useState } from 'react';
import Loading from './Loading';
import { useApi } from './useApi';
import './DataList.css';

interface DataListProps {}

const DataList: React.FC<DataListProps> = () => {
  const { appData, loading, error, refreshAppData } = useApi();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setLocalError('Failed to load data');
    }
  }, [error]);

  if (loading) {
    return <Loading message="Loading data..." />;
  }

  if (localError) {
    return <div className="error-message">{localError}</div>;
  }

  return (
    <div className="data-list">
      <h2>Data List</h2>
      {appData ? (
        <ul>
          <li>Name: {appData.analysis.appSummary.name}</li>
          <li>Description: {appData.analysis.appSummary.description}</li>
          <li>Region: {appData.infrastructure.region}</li>
          <li>Provider: {appData.infrastructure.provider}</li>
        </ul>
      ) : (
        <div>No data available</div>
      )}
      <button onClick={refreshAppData} className="refresh-button">Refresh Data</button>
    </div>
  );
};

export default DataList;

// DataList.css

.data-list {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 10px;
}

.refresh-button {
  padding: 10px 20px;
  font-size: 16px;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.refresh-button:hover {
  background-color: #0056b3;
}