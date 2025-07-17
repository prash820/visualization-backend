import React, { useState, useEffect } from 'react';
import { CloudFront } from '../services/CloudFront';

interface CalculateButtonProps {
  onCalculate: (expression: string) => void;
  isLoading: boolean;
}

const CalculateButton: React.FC<CalculateButtonProps> = ({ onCalculate, isLoading }) => {
  const [expression, setExpression] = useState<string>('');

  const handleClick = () => {
    if (expression.trim()) {
      onCalculate(expression);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="calculate-button"
      aria-label="Calculate"
    >
      {isLoading ? 'Calculating...' : 'Calculate'}
    </button>
  );
};

export default CalculateButton;