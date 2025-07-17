import React from 'react';

interface SuccessProps {
  message: string;
}

const Success: React.FC<SuccessProps> = ({ message }) => {
  return (
    <div className="success-message" role="alert" aria-live="polite">
      <p>{message}</p>
    </div>
  );
};

export default Success;