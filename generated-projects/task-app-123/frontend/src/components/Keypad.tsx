import React from 'react';

interface KeypadProps {
  onButtonClick: (value: string) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onButtonClick }) => {
  const buttons = ['1', '2', '3', '+', '4', '5', '6', '-', '7', '8', '9', '*', '0', '=', '/'];

  return (
    <div className="keypad">
      {buttons.map((btn) => (
        <button key={btn} onClick={() => onButtonClick(btn)}>
          {btn}
        </button>
      ))}
    </div>
  );
};

export default Keypad;