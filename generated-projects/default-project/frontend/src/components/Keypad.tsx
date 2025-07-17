import React, { useState } from 'react';
import { NumberKeys } from './NumberKeys';
import { OperationKeys } from './OperationKeys';
import { CalculateButton } from './CalculateButton';

interface KeypadProps {
  onInputChange: (input: string) => void;
  onCalculate: () => void;
}

const Keypad: React.FC<KeypadProps> = ({ onInputChange, onCalculate }) => {
  const [input, setInput] = useState<string>('');

  const handleNumberClick = (number: string) => {
    const newInput = input + number;
    setInput(newInput);
    onInputChange(newInput);
  };

  const handleOperationClick = (operation: string) => {
    const newInput = input + operation;
    setInput(newInput);
    onInputChange(newInput);
  };

  const handleCalculate = () => {
    onCalculate();
  };

  return (
    <div className="keypad" role="region" aria-label="Calculator Keypad">
      <NumberKeys onNumberClick={handleNumberClick} />
      <OperationKeys onOperationClick={handleOperationClick} />
      <CalculateButton onCalculate={handleCalculate} />
    </div>
  );
};

export default Keypad;