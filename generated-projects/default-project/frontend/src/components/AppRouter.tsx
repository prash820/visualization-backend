import React, { useState, useEffect } from 'react';
import { AppLayout } from './AppLayout';

interface Route {
  path: string;
  component: React.FC;
}

const routes: Route[] = [
  { path: '/', component: HomePage },
  { path: '/calculator', component: CalculatorPage },
  // Add more routes as needed
];

const AppRouter: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const initializeRoutes = () => {
    const route = routes.find(route => route.path === currentPath);
    return route ? <route.component /> : <NotFoundPage />;
  };

  return (
    <AppLayout>
      {initializeRoutes()}
    </AppLayout>
  );
};

export default AppRouter;