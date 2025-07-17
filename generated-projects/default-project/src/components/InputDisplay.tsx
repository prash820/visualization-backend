import React, { useState, useEffect } from 'react';
import { CloudFront } from '../services/CloudFront';

interface InputDisplayProps {
  currentInput: string;
}

const InputDisplay: React.FC<InputDisplayProps> = ({ currentInput }) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    setDisplayValue(currentInput);
  }, [currentInput]);

  return (
    <div className="input-display" role="textbox" aria-label="Current Input Display">
      {displayValue}
    </div>
  );
};

export default InputDisplay;