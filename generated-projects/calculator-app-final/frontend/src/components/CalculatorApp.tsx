import React, { useState } from 'react';
import Display from './Display';
import Keypad from './Keypad';

const CalculatorApp: React.FC = () => {
  const [displayValue, setDisplayValue] = useState('');

  const handleButtonClick = (value: string) => {
    setDisplayValue(prev => prev + value);
  };

  return (
    <div>
      <Display value={displayValue} />
      <Keypad onButtonClick={handleButtonClick} />
    </div>
  );
};

export default CalculatorApp;