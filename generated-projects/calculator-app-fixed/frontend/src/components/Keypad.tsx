import React from 'react';

interface KeypadProps {
  onButtonClick: (value: string) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onButtonClick }) => {
  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
    'C'
  ];

  return (
    <div className="keypad">
      {buttons.map((button, index) => (
        <button
          key={index}
          className={`key ${button === '=' ? 'equals' : button === 'C' ? 'clear' : ['+', '-', '*', '/'].includes(button) ? 'operator' : ''}`}
          onClick={() => onButtonClick(button)}
        >
          {button}
        </button>
      ))}
    </div>
  );
};

export default Keypad;