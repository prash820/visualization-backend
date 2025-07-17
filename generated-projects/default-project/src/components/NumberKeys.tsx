import React, { useState } from 'react';
import { CloudFront } from '../services/CloudFront';

interface NumberKeysProps {
  onNumberClick: (number: string) => void;
}

const NumberKeys: React.FC<NumberKeysProps> = ({ onNumberClick }) => {
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const handleNumberClick = (number: string) => {
    onNumberClick(number);
  };

  return (
    <div className="number-keys" role="group" aria-label="Number keys">
      {numbers.map((number) => (
        <button
          key={number}
          className="number-key"
          onClick={() => handleNumberClick(number)}
          aria-label={`Number ${number}`}
        >
          {number}
        </button>
      ))}
    </div>
  );
};

export default NumberKeys;