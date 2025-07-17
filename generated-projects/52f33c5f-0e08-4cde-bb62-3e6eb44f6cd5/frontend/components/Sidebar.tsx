import React, { useState } from 'react';

interface SidebarProps {
  sections: string[];
  onNavigate: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sections, onNavigate }) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const navigateTo = (section: string) => {
    onNavigate(section);
  };

  return (
    <div className={`sidebar ${isVisible ? 'visible' : 'hidden'}`} aria-label="Sidebar">
      <button onClick={toggleVisibility} aria-label="Toggle Sidebar Visibility">
        {isVisible ? 'Hide' : 'Show'} Sidebar
      </button>
      {isVisible && (
        <ul role="navigation" aria-label="Sections">
          {sections.map((section, index) => (
            <li key={index}>
              <button onClick={() => navigateTo(section)} aria-label={`Navigate to ${section}`}>
                {section}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;