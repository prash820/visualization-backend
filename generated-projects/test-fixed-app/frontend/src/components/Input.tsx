// Input.tsx

import React, { useState } from 'react';
import './Input.css'; // Assuming you have some basic styles

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  disabled = false,
  error = ''
}) => {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="input-container">
      <input
        type={type}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        disabled={disabled}
        className={`input ${error ? 'input-error' : ''}`}
        aria-label={placeholder}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;

// Input.css

.input-container {
  display: flex;
  flex-direction: column;
}

.input {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  transition: border-color 0.3s ease;
}

.input:focus {
  border-color: #007bff;
}

.input-error {
  border-color: #ff4d4f;
}

.input-error-message {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}