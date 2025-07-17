import React, { useState, useEffect } from 'react';
import { Router } from './Router';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate an async operation such as fetching configuration
    const initializeApp = async () => {
      try {
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize the application');
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <div role="status" aria-label="Loading">Loading...</div>;
  }

  if (error) {
    return <div role="alert" aria-label="Error">{error}</div>;
  }

  return (
    <div className="app" role="main">
      <Router />
    </div>
  );
};

export default App;