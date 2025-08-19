import React, { useState } from 'react';
import Display from './Display';
import Keypad from './Keypad';

const CalculatorApp: React.FC = () => {
  const [displayValue, setDisplayValue] = useState('');

  const updateDisplay = (value: string) => {
    setDisplayValue(value);
  };

  const handleKeyPress = (key: string) => {
    // Logic to handle key press and update display
    updateDisplay(displayValue + key);
  };

  return (
    <div className="calculator-app">
      <Display value={displayValue} />
      <Keypad onKeyPress={handleKeyPress} />
    </div>
  );
};

export default CalculatorApp;