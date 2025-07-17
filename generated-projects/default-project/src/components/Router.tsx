import React, { useState, useEffect } from 'react';
import { MainPage } from './MainPage';
import { CloudFront } from '../services/CloudFront';

const Router: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>('main');

  useEffect(() => {
    const cloudFrontService = new CloudFront();
    // Example: cloudFrontService.someMethod();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'main':
        return <MainPage />;
      default:
        return <MainPage />;
    }
  };

  return (
    <div className="router" role="navigation" aria-label="Application Router">
      {renderPage()}
    </div>
  );
};

export default Router;