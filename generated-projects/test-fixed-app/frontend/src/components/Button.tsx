// Button.tsx

import React from 'react';
import './Button.css'; // Assuming you have some basic styles

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button
      className="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {label}
    </button>
  );
};

export default Button;

// Button.css

.button {
  padding: 10px 20px;
  font-size: 16px;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.button:not(:disabled):hover {
  background-color: #0056b3;
}