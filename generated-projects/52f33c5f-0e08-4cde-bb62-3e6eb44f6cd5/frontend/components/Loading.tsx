import React, { useState, useEffect } from 'react';

interface LoadingProps {
  isLoading: boolean;
}

const Loading: React.FC<LoadingProps> = ({ isLoading }) => {
  const [visible, setVisible] = useState<boolean>(isLoading);

  useEffect(() => {
    setVisible(isLoading);
  }, [isLoading]);

  const showLoading = () => setVisible(true);
  const hideLoading = () => setVisible(false);

  return (
    <div
      className={`loading-overlay ${visible ? 'visible' : 'hidden'}`}
      role="status"
      aria-live="polite"
    >
      {visible && <div className="spinner" aria-label="Loading..."></div>}
    </div>
  );
};

export default Loading;