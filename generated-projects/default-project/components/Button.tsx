import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      className="btn"
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
    >
      {label}
    </button>
  );
};

export default Button;