import React, { useState, useEffect } from 'react';

interface ContainerProps {
  children: React.ReactNode;
  title: string;
}

const Container: React.FC<ContainerProps> = ({ children, title }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulate a loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div role="status" aria-live="polite">Loading...</div>;
  }

  return (
    <div className="container" aria-label={title}>
      <h1>{title}</h1>
      {children}
    </div>
  );
};

export default Container;