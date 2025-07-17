import React, { useState, useEffect } from 'react';
import { ResultDisplay } from './ResultDisplay';
import { InputDisplay } from './InputDisplay';
import { CloudFront } from '../services/CloudFront';

interface DisplayProps {
  initialInput: string;
  initialResult: string;
}

const Display: React.FC<DisplayProps> = ({ initialInput, initialResult }) => {
  const [currentInput, setCurrentInput] = useState<string>(initialInput);
  const [result, setResult] = useState<string>(initialResult);

  useEffect(() => {
    // Placeholder for any effect related to CloudFront or other services
    const cloudFrontService = new CloudFront();
    // Example: cloudFrontService.someMethod();
  }, []);

  return (
    <div className="display-container" aria-label="Calculator Display">
      <InputDisplay currentInput={currentInput} />
      <ResultDisplay result={result} />
    </div>
  );
};

export default Display;