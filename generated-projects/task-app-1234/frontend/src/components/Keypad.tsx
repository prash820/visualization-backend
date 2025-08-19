import React from 'react';
import Key from './Key';

interface KeypadProps {
  onKeyPress: (key: string) => void;
}

const Keypad: React.FC<KeypadProps> = ({ onKeyPress }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '+', '-', '*', '/'];

  return (
    <div className="keypad">
      {keys.map((key) => (
        <Key key={key} value={key} onPress={() => onKeyPress(key)} />
      ))}
    </div>
  );
};

export default Keypad;