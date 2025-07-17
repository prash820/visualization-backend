import React, { useState, useEffect } from 'react';
import { ResultDisplay } from './ResultDisplay';
import { InputDisplay } from './InputDisplay';

interface DisplayProps {
  initialInput: string;
  initialResult: string;
}

const Display: React.FC<DisplayProps> = ({ initialInput, initialResult }) => {
  const [currentInput, setCurrentInput] = useState<string>(initialInput);
  const [calculationResult, setCalculationResult] = useState<string>(initialResult);

  useEffect(() => {
    setCurrentInput(initialInput);
  }, [initialInput]);

  useEffect(() => {
    setCalculationResult(initialResult);
  }, [initialResult]);

  return (
    <div className="display" aria-label="Calculator Display">
      <InputDisplay currentInput={currentInput} />
      <ResultDisplay result={calculationResult} />
    </div>
  );
};

export default Display;