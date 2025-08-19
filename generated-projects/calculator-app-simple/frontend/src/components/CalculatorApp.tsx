import React, { useState } from 'react';
import Display from './Display';
import Keypad from './Keypad';

const CalculatorApp: React.FC = () => {
  const [displayValue, setDisplayValue] = useState('');

  const handleKeyPress = (key: string) => {
    setDisplayValue(prev => prev + key);
  };

  return (
    <div>
      <Display value={displayValue} />
      <Keypad onKeyPress={handleKeyPress} />
    </div>
  );
};

export default CalculatorApp;