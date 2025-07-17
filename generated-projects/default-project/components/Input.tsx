import React, { useState } from 'react';

interface InputProps {
  onInputChange: (value: string) => void;
}

const Input: React.FC<InputProps> = ({ onInputChange }) => {
  const [inputValue, setInputValue] = useState<string>('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onInputChange(newValue);
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      className="calculator-input"
      aria-label="Calculator Input"
    />
  );
};

export default Input;