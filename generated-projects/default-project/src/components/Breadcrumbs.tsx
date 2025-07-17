import React from 'react';

interface BreadcrumbsProps {
  paths: string[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ paths }) => {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {paths.map((path, index) => (
          <li
            key={index}
            className={`breadcrumb-item ${index === paths.length - 1 ? 'active' : ''}`}
            aria-current={index === paths.length - 1 ? 'page' : undefined}
          >
            {index === paths.length - 1 ? path : <a href="#">{path}</a>}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;