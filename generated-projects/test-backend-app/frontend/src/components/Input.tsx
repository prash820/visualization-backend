// Input.tsx

import React, { useState, ChangeEvent, FocusEvent } from 'react';
import { AppError } from './types';
import { handleAppError, createAppError } from './utils';
import { ERROR_CODES } from './constants';

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
  error?: AppError | null;
}

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  required = false,
  error = null
}) => {
  const [touched, setTouched] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setTouched(true);
  };

  const renderError = () => {
    if (error && touched) {
      handleAppError(error);
      return <div className="error-message">{error.message}</div>;
    }
    return null;
  };

  return (
    <div className={`input-group ${className}`}>
      <label className="input-label">
        {label}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`input-field ${error && touched ? 'input-error' : ''}`}
        />
      </label>
      {renderError()}
    </div>
  );
};

export default Input;
