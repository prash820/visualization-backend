// DetailPage.tsx

import React, { useState, useEffect } from 'react';
import DataForm from './DataForm';
import DataList from './DataList';
import { useApi } from './useApi';
import './DetailPage.css';

interface DetailPageProps {}

const DetailPage: React.FC<DetailPageProps> = () => {
  const { appData, loading, error, refreshAppData } = useApi();
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setLocalError('Failed to load data');
    }
  }, [error]);

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (localError) {
    return <div className="error-message">{localError}</div>;
  }

  return (
    <div className="detail-page">
      <header className="detail-page-header">
        <h1>Detail Page</h1>
        <p>Manage and view application details</p>
      </header>
      <main className="detail-page-main">
        <section className="data-section">
          <DataForm />
          <DataList />
        </section>
      </main>
    </div>
  );
};

export default DetailPage;

// DetailPage.css

.detail-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.detail-page-header {
  text-align: center;
  margin-bottom: 40px;
}

.detail-page-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 800px;
}

.data-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 10px;
}

.loading {
  font-size: 16px;
  color: #333;
}