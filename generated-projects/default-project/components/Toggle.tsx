import React, { useState } from 'react';

interface ToggleProps {
  initialState?: boolean;
  onToggle?: (state: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ initialState = false, onToggle }) => {
  const [isToggled, setIsToggled] = useState<boolean>(initialState);

  const handleToggle = () => {
    const newState = !isToggled;
    setIsToggled(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <button 
      onClick={handleToggle} 
      className={`toggle-button ${isToggled ? 'toggled' : ''}`} 
      aria-pressed={isToggled}
      aria-label="Toggle Button"
    >
      {isToggled ? 'On' : 'Off'}
    </button>
  );
};

export default Toggle;