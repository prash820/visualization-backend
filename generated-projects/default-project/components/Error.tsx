import React from 'react';

interface ErrorProps {
  message: string;
}

const Error: React.FC<ErrorProps> = ({ message }) => {
  return (
    <div role="alert" aria-live="assertive" className="error-message">
      {message}
    </div>
  );
};

export default Error;