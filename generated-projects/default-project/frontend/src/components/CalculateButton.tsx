import React from 'react';

interface CalculateButtonProps {
  onCalculate: () => void;
}

const CalculateButton: React.FC<CalculateButtonProps> = ({ onCalculate }) => {
  return (
    <button onClick={onCalculate} className="calculate-button" aria-label="Calculate">
      Calculate
    </button>
  );
};

export default CalculateButton;