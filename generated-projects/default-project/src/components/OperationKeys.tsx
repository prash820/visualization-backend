import React, { useState, useEffect } from 'react';
import { CloudFront } from '../services/CloudFront';

interface OperationKeysProps {
  onOperationClick: (operation: string) => void;
}

const OperationKeys: React.FC<OperationKeysProps> = ({ onOperationClick }) => {
  const [operations, setOperations] = useState<string[]>(['+', '-', '*', '/', '^', 'sqrt']);

  useEffect(() => {
    // Example of using CloudFront service if needed
    CloudFront.fetchOperations().then(fetchedOperations => {
      setOperations(fetchedOperations);
    }).catch(error => {
      console.error('Failed to fetch operations:', error);
    });
  }, []);

  return (
    <div className="operation-keys" role="group" aria-label="Calculator operations">
      {operations.map((operation, index) => (
        <button
          key={index}
          className="operation-button"
          onClick={() => onOperationClick(operation)}
          aria-label={`Operation ${operation}`}
        >
          {operation}
        </button>
      ))}
    </div>
  );
};

export default OperationKeys;