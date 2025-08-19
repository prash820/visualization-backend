import React, { useState } from 'react';
import Display from './Display';
import Keypad from './Keypad';

const CalculatorApp: React.FC = () => {
  const [displayValue, setDisplayValue] = useState('');

  const handleInput = (input: string) => {
    setDisplayValue(prev => prev + input);
  };

  return (
    <div className="calculator-app">
      <Display value={displayValue} />
      <Keypad onButtonClick={handleInput} />
    </div>
  );
};

export default CalculatorApp;