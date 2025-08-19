// Input.tsx

import React, { useState, ChangeEvent } from 'react';

interface InputProps {
  type: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const Input: React.FC<InputProps> = ({ type, placeholder = '', value = '', onChange, disabled = false, error }) => {
  const [inputValue, setInputValue] = useState<string>(value);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <input
        type={type}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        disabled={disabled}
        style={{
          padding: '10px',
          fontSize: '16px',
          border: error ? '1px solid red' : '1px solid #ccc',
          borderRadius: '4px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {error && <div style={{ color: 'red', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default Input;
