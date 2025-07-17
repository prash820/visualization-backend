import React, { useState, useEffect } from 'react';

interface SelectProps {
  options: Array<{ label: string; value: string }>;
  onChange: (selectedValue: string) => void;
  ariaLabel?: string;
}

const Select: React.FC<SelectProps> = ({ options, onChange, ariaLabel }) => {
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedValue(value);
    onChange(value);
  };

  useEffect(() => {
    if (options.length > 0) {
      setSelectedValue(options[0].value);
    }
  }, [options]);

  return (
    <select
      value={selectedValue}
      onChange={handleSelectChange}
      aria-label={ariaLabel || 'Select an option'}
      className="select-component"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;