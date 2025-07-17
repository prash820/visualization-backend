import React from 'react';

interface OperationKeysProps {
  onOperationClick: (operation: string) => void;
}

const OperationKeys: React.FC<OperationKeysProps> = ({ onOperationClick }) => {
  const operations = ['+', '-', '*', '/', '^', '√'];

  return (
    <div className="operation-keys" role="group" aria-label="Operation Keys">
      {operations.map((operation) => (
        <button
          key={operation}
          onClick={() => onOperationClick(operation)}
          className="operation-key"
          aria-label={`Operation ${operation}`}
        >
          {operation}
        </button>
      ))}
    </div>
  );
};

export default OperationKeys;