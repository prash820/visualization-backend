import React, { useState } from 'react';

interface OperationKeysProps {
  onOperationSelect: (operation: string) => void;
}

const OperationKeys: React.FC<OperationKeysProps> = ({ onOperationSelect }) => {
  const [selectedOperation, setSelectedOperation] = useState<string>('');

  const handleOperationClick = (operation: string) => {
    setSelectedOperation(operation);
    onOperationSelect(operation);
  };

  return (
    <div className="operation-keys" role="group" aria-label="Calculator operations">
      <button className="operation-key" onClick={() => handleOperationClick('+')} aria-label="Add">+</button>
      <button className="operation-key" onClick={() => handleOperationClick('-')} aria-label="Subtract">-</button>
      <button className="operation-key" onClick={() => handleOperationClick('*')} aria-label="Multiply">*</button>
      <button className="operation-key" onClick={() => handleOperationClick('/')} aria-label="Divide">/</button>
      <button className="operation-key" onClick={() => handleOperationClick('^')} aria-label="Exponent">^</button>
      <button className="operation-key" onClick={() => handleOperationClick('√')} aria-label="Square Root">√</button>
    </div>
  );
};

export default OperationKeys;