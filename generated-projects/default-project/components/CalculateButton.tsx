import React, { useState } from 'react';

interface CalculateButtonProps {
  onCalculate: () => void;
  isLoading: boolean;
}

const CalculateButton: React.FC<CalculateButtonProps> = ({ onCalculate, isLoading }) => {
  return (
    <button
      onClick={onCalculate}
      className="calculate-button"
      disabled={isLoading}
      aria-label="Calculate"
    >
      {isLoading ? 'Calculating...' : 'Calculate'}
    </button>
  );
};

export default CalculateButton;