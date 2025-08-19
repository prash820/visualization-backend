// Loading.tsx

import React from 'react';

interface LoadingProps {
  message?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`loading-container ${className}`} role="alert" aria-busy="true">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default Loading;

// CSS (Assuming CSS-in-JS or a CSS file is used)
// .loading-container {
//   display: flex;
//   flex-direction: column;
//   align-items: center;
//   justify-content: center;
//   height: 100%;
//   text-align: center;
// }
// .spinner {
//   border: 4px solid rgba(0, 0, 0, 0.1);
//   border-left-color: #22a6b3;
//   border-radius: 50%;
//   width: 40px;
//   height: 40px;
//   animation: spin 1s linear infinite;
// }
// @keyframes spin {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }