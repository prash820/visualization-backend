// Loading.tsx

import React from 'react';
import './Loading.css'; // Assuming you have some basic styles

interface LoadingProps {
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-container" aria-live="polite">
      <div className="spinner"></div>
      <span className="loading-message">{message}</span>
    </div>
  );
};

export default Loading;

// Loading.css

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.8);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #ccc;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  margin-top: 10px;
  font-size: 16px;
  color: #333;
}