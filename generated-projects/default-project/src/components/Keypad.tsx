import React, { useState } from 'react';
import { NumberKeys } from './NumberKeys';
import { OperationKeys } from './OperationKeys';
import { CalculateButton } from './CalculateButton';

interface KeypadProps {
  onInputChange: (input: string) => void;
  onCalculate: (expression: string) => void;
  isLoading: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ onInputChange, onCalculate, isLoading }) => {
  const [currentInput, setCurrentInput] = useState<string>('');

  const handleNumberClick = (number: string) => {
    const newInput = currentInput + number;
    setCurrentInput(newInput);
    onInputChange(newInput);
  };

  const handleOperationClick = (operation: string) => {
    const newInput = currentInput + operation;
    setCurrentInput(newInput);
    onInputChange(newInput);
  };

  const handleCalculate = () => {
    onCalculate(currentInput);
  };

  return (
    <div className="keypad" role="region" aria-label="Calculator keypad">
      <NumberKeys onNumberClick={handleNumberClick} />
      <OperationKeys onOperationClick={handleOperationClick} />
      <CalculateButton onCalculate={handleCalculate} isLoading={isLoading} />
    </div>
  );
};

export default Keypad;