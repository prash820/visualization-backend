import React, { useState, useEffect } from 'react';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  initialValue: number;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ min, max, step, initialValue, onChange }) => {
  const [value, setValue] = useState<number>(initialValue);

  const handleSlide = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    setValue(newValue);
    onChange(newValue);
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className="slider-container">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSlide}
        className="slider"
        aria-label="Value Slider"
      />
      <span className="slider-value">{value}</span>
    </div>
  );
};

export default Slider;