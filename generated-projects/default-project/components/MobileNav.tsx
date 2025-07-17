import React, { useState } from 'react';

interface MobileNavProps {
  items: { label: string; href: string }[];
}

const MobileNav: React.FC<MobileNavProps> = ({ items }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleNav = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="mobile-nav" aria-label="Mobile Navigation">
      <button
        className="mobile-nav-toggle"
        aria-expanded={isOpen}
        onClick={toggleNav}
      >
        {isOpen ? 'Close' : 'Menu'}
      </button>
      <ul className={`mobile-nav-list ${isOpen ? 'open' : 'closed'}`}>
        {items.map((item, index) => (
          <li key={index} className="mobile-nav-item">
            <a href={item.href} className="mobile-nav-link">
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default MobileNav;