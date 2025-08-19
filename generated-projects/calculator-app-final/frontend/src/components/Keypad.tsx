// Keypad.tsx
import React from 'react';

interface KeypadProps {
  onButtonClick: (value: string) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onButtonClick }) => {
  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '0', '+', '-',
    '*', '/', '='
  ];

  return (
    <div className="keypad">
      {buttons.map((button) => (
        <button
          key={button}
          onClick={() => onButtonClick(button)}
        >
          {button}
        </button>
      ))}
    </div>
  );
};

export default Keypad;
