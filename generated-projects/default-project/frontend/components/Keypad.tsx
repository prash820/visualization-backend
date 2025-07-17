import React, { useState } from 'react';
import { NumberKeys } from './NumberKeys';
import { OperationKeys } from './OperationKeys';
import { CalculateButton } from './CalculateButton';

interface KeypadProps {
  onInputChange: (input: string) => void;
  onCalculate: () => void;
  isLoading: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ onInputChange, onCalculate, isLoading }) => {
  const [input, setInput] = useState<string>('');

  const handleNumberClick = (number: string) => {
    const newInput = input + number;
    setInput(newInput);
    onInputChange(newInput);
  };

  const handleOperationSelect = (operation: string) => {
    const newInput = input + ' ' + operation + ' ';
    setInput(newInput);
    onInputChange(newInput);
  };

  return (
    <div className="keypad" role="group" aria-label="Calculator Keypad">
      <NumberKeys onNumberClick={handleNumberClick} />
      <OperationKeys onOperationSelect={handleOperationSelect} />
      <CalculateButton onCalculate={onCalculate} isLoading={isLoading} />
    </div>
  );
};

export default Keypad;