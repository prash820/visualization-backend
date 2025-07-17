import React, { useState } from 'react';

interface CalculatorKeypadProps {
  onKeyPress: (key: string) => void;
}

const CalculatorKeypad: React.FC<CalculatorKeypadProps> = ({ onKeyPress }) => {
  const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  const handleKeyPress = (key: string) => {
    onKeyPress(key);
  };

  return (
    <div className="calculator-keypad" role="grid" aria-label="Calculator Keypad">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => handleKeyPress(key)}
          className="calculator-key"
          aria-label={`Key ${key}`}
        >
          {key}
        </button>
      ))}
    </div>
  );
};

export default CalculatorKeypad;