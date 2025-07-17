import React, { useState, useEffect } from 'react';

interface CalculatorDisplayProps {
  value: string;
}

const CalculatorDisplay: React.FC<CalculatorDisplayProps> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState<string>(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const updateDisplay = (newValue: string) => {
    setDisplayValue(newValue);
  };

  return (
    <div className="calculator-display" aria-label="Calculator Display">
      <input
        type="text"
        value={displayValue}
        readOnly
        className="display-input"
        aria-readonly="true"
      />
    </div>
  );
};

export default CalculatorDisplay;