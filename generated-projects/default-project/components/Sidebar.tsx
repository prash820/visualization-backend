import React, { useState } from 'react';

interface SidebarProps {
  userOptions: string[];
  onNavigate: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userOptions, onNavigate }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleNavigation = (option: string) => {
    setSelectedOption(option);
    onNavigate(option);
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Sidebar Navigation">
      <ul className="sidebar-list">
        {userOptions.map((option, index) => (
          <li key={index} className={`sidebar-item ${selectedOption === option ? 'active' : ''}`}>
            <button
              className="sidebar-button"
              onClick={() => handleNavigation(option)}
              aria-label={`Navigate to ${option}`}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;