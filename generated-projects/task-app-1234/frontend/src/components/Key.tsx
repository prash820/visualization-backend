import React from 'react';

interface KeyProps {
  value: string;
  onPress: () => void;
}

const Key: React.FC<KeyProps> = ({ value, onPress }) => {
  return (
    <button className="key" onClick={onPress}>
      {value}
    </button>
  );
};

export default Key;