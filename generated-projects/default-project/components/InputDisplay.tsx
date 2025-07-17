import React, { useState, useEffect } from 'react';

interface InputDisplayProps {
  currentInput: string;
}

const InputDisplay: React.FC<InputDisplayProps> = ({ currentInput }) => {
  const [displayValue, setDisplayValue] = useState<string>(currentInput);

  useEffect(() => {
    setDisplayValue(currentInput);
  }, [currentInput]);

  return (
    <div className="input-display" aria-label="Current Input Display">
      {displayValue}
    </div>
  );
};

export default InputDisplay;