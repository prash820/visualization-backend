import React, { useState, useEffect } from 'react';
import { Router } from './Router';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate an API call to demonstrate loading and error handling
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Simulated API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load data');
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div role="alert" aria-busy="true">Loading...</div>;
  }

  if (error) {
    return <div role="alert" aria-live="assertive">{error}</div>;
  }

  return (
    <div className="app" aria-label="Calculator Application">
      <Router />
    </div>
  );
};

export default App;