import React, { useState, useEffect } from 'react';

interface ResultDisplayProps {
  result: string;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const [displayResult, setDisplayResult] = useState<string>('');

  useEffect(() => {
    setDisplayResult(result);
  }, [result]);

  return (
    <div className="result-display" aria-label="Calculation Result">
      <p>{displayResult}</p>
    </div>
  );
};

export default ResultDisplay;