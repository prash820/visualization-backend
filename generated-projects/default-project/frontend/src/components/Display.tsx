import React, { useState, useEffect } from 'react';
import { ResultDisplay } from './ResultDisplay';
import { InputDisplay } from './InputDisplay';

interface DisplayProps {
  initialInput: string;
  initialResult: number;
}

const Display: React.FC<DisplayProps> = ({ initialInput, initialResult }) => {
  const [currentInput, setCurrentInput] = useState<string>(initialInput);
  const [result, setResult] = useState<number>(initialResult);

  useEffect(() => {
    // Logic to update result based on currentInput can be added here
  }, [currentInput]);

  return (
    <div className="display" aria-label="Calculator Display">
      <InputDisplay currentInput={currentInput} />
      <ResultDisplay result={result} />
    </div>
  );
};

export default Display;