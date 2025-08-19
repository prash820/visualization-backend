import React, { useState } from 'react';
import Display from './Display';
import Keypad from './Keypad';

const CalculatorApp: React.FC = () => {
  const [displayValue, setDisplayValue] = useState('');

  const handleInput = (input: string) => {
    setDisplayValue(prev => prev + input);
  };

  const calculateResult = () => {
    try {
      setDisplayValue(eval(displayValue).toString());
    } catch {
      setDisplayValue('Error');
    }
  };

  return (
    <div>
      <Display value={displayValue} />
      <Keypad onInput={handleInput} onCalculate={calculateResult} />
    </div>
  );
};

export default CalculatorApp;