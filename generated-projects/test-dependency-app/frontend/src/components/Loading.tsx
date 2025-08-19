// Loading.tsx

import React from 'react';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', size = 'medium' }) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: '20px', height: '20px' };
      case 'medium':
        return { width: '40px', height: '40px' };
      case 'large':
        return { width: '60px', height: '60px' };
      default:
        return { width: '40px', height: '40px' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div
        style={{
          ...getSizeStyles(),
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 2s linear infinite',
        }}
      />
      <p style={{ marginTop: '10px', fontSize: '16px', color: '#555' }}>{message}</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Loading;
