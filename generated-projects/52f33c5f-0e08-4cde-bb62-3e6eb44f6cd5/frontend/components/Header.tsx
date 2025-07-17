import React from 'react';

interface HeaderProps {
  title: string;
  onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, onSettingsClick }) => {
  const renderHeader = () => (
    <header className="app-header" role="banner">
      <h1 className="app-title" aria-label="Application Title">{title}</h1>
      <button
        className="settings-button"
        onClick={handleSettingsClick}
        aria-label="User Settings"
      >
        Settings
      </button>
    </header>
  );

  const handleSettingsClick = () => {
    try {
      onSettingsClick();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  };

  return renderHeader();
};

export default Header;