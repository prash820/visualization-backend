import React from 'react';
import { MainPage } from './MainPage';

const Router: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState<string>('main');

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