import React from 'react';

interface ResultDisplayProps {
  result: number;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  return (
    <div className="result-display" aria-label="Result Display">
      <p>{result}</p>
    </div>
  );
};

export default ResultDisplay;