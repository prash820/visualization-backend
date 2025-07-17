import React, { useState, useEffect } from 'react';

interface InputDisplayProps {
  currentInput: string;
}

const InputDisplay: React.FC<InputDisplayProps> = ({ currentInput }) => {
  const [input, setInput] = useState<string>(currentInput);

  useEffect(() => {
    setInput(currentInput);
  }, [currentInput]);

  return (
    <div className="input-display" aria-label="Calculator Input Display">
      {input}
    </div>
  );
};

export default InputDisplay;