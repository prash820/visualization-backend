import React from 'react';

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="loading-message">{message}</span>
    </div>
  );
};

export default Loading;