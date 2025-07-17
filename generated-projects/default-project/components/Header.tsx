import React from 'react';

interface HeaderProps {
  logoSrc: string;
  links: { name: string; href: string }[];
}

const Header: React.FC<HeaderProps> = ({ logoSrc, links }) => {
  return (
    <header className="header" role="banner">
      <div className="logo">
        <img src={logoSrc} alt="App Logo" aria-label="App Logo" />
      </div>
      <nav className="navigation" role="navigation" aria-label="Main Navigation">
        <ul>
          {links.map((link, index) => (
            <li key={index}>
              <a href={link.href} className="nav-link">
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default Header;