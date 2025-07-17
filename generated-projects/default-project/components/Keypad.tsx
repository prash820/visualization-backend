import React, { useState } from 'react';

interface KeypadProps {
  onKeyPress: (key: string) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onKeyPress }) => {
  const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  const handleButtonClick = (key: string) => {
    onKeyPress(key);
  };

  return (
    <div className="keypad" role="grid" aria-label="Calculator keypad">
      {keys.map((key) => (
        <button
          key={key}
          className="keypad-button"
          onClick={() => handleButtonClick(key)}
          aria-label={`Key ${key}`}
        >
          {key}
        </button>
      ))}
    </div>
  );
};

export default Keypad;